/**
 * Lightweight Supabase-backed job queue.
 * Requires Migration 013 (processing_jobs table).
 */
import supabase from '../database/supabase.js';

const MAX_ATTEMPTS = 3;
const WORKER_INTERVAL_MS = 5000;
let workerRunning = false;

export async function enqueueJob(userId, jobType, payload) {
  try {
    const { error } = await supabase
      .from('processing_jobs')
      .insert({ user_id: userId, job_type: jobType, payload, status: 'pending' });
    if (error) {
      console.warn(`[jobQueue] Could not enqueue ${jobType} (${error.message}) — running inline via setImmediate.`);
      setImmediate(() => runJobInline(userId, jobType, payload));
    }
  } catch (err) {
    console.warn(`[jobQueue] enqueueJob failed: ${err.message} — running inline.`);
    setImmediate(() => runJobInline(userId, jobType, payload));
  }
}

export async function processNextJob() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const { data: jobs, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error || !jobs || jobs.length === 0) return;
    const job = jobs[0];
    const { error: claimError } = await supabase
      .from('processing_jobs')
      .update({ status: 'processing', attempts: job.attempts + 1, updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending');
    if (claimError) return;
    try {
      await runJobInline(job.user_id, job.job_type, job.payload);
      await supabase
        .from('processing_jobs')
        .update({ status: 'complete', updated_at: new Date().toISOString() })
        .eq('id', job.id);
    } catch (err) {
      console.error(`[jobQueue] Job ${job.id} (${job.job_type}) failed: ${err.message}`);
      const newStatus = job.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await supabase
        .from('processing_jobs')
        .update({ status: newStatus, error_msg: err.message, updated_at: new Date().toISOString() })
        .eq('id', job.id);
    }
  } catch (err) {
    console.error('[jobQueue] Worker poll error:', err.message);
  } finally {
    workerRunning = false;
  }
}

async function runJobInline(userId, jobType, payload) {
  if (jobType === 'embed_book') {
    const { embedBookChunksFromQueue } = await import('../routes/books.js');
    await embedBookChunksFromQueue(payload.bookId);
  } else if (jobType === 'extract_concepts') {
    const memoryService = await import('./memoryService.js');
    await memoryService.processInsightForConcepts(userId, {
      id: payload.insightId,
      content: payload.content,
      source_ids: payload.sourceIds || [],
      tags: payload.tags || []
    });
  } else if (jobType === 'summarize_session') {
    console.log(`[jobQueue] summarize_session job ${payload.sessionId} skipped (synchronous).`);
  }
}

export function startWorker() {
  console.log(`[jobQueue] Worker started — polling every ${WORKER_INTERVAL_MS}ms`);
  setInterval(processNextJob, WORKER_INTERVAL_MS);
}
