import 'dotenv/config';
import express   from 'express';
import cors      from 'cors';
import helmet    from 'helmet';
import morgan    from 'morgan';
import rateLimit from 'express-rate-limit';
import booksRouter   from './routes/books.js';
import chatRouter    from './routes/chat.js';
import profileRouter from './routes/profile.js';
import sourcesRouter from './routes/sources.js';
import learnRouter   from './routes/learn.js';
import labRouter     from './routes/experienceLab.js';

const app  = express();
const PORT = process.env.PORT || 3001;

process.on('unhandledRejection', (reason) => { console.error('[unhandledRejection]', reason); });
process.on('uncaughtException',  (err)    => { console.error('[uncaughtException]',  err);    });

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 2000,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(generalLimiter);

// AI limiter is applied per-route inside routes/learn.js and routes/experienceLab.js
// (only on the routes that actually call the AI — not on GETs/list endpoints)

app.get('/', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/books',   booksRouter);
app.use('/api/chat',    chatRouter);
app.use('/api/profile', profileRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/learn',   learnRouter);
app.use('/api/lab',     labRouter);

app.use((err, req, res, next) => {
  console.error('[Error]', err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

async function checkMigrations() {
  const supabase = (await import('./database/supabase.js')).default;
  const checks = [
    { table: 'books',             migration: 'migrations.sql (base)'  },
    { table: 'book_chunks',       migration: 'migrations.sql (base)'  },
    { table: 'learning_sessions', migration: 'migrations_008'         },
    { table: 'experiments',       migration: 'migrations_009'         },
    { table: 'insights',          migration: 'migrations_010'         },
    { table: 'concept_nodes',     migration: 'migrations_010'         },
    { table: 'concept_edges',     migration: 'migrations_010'         },
    { table: 'processing_jobs',   migration: 'migrations_013'         },
  ];
  const results = await Promise.allSettled(
    checks.map(c => supabase.from(c.table).select('id').limit(1).then(({ error }) => ({ ...c, error })))
  );
  let allGood = true;
  for (const r of results) {
    const { table, migration, error } = r.status === 'fulfilled' ? r.value : { table: '?', migration: '?', error: r.reason };
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        console.warn('[startup] WARNING: Table "' + table + '" missing — run ' + migration + ' in Supabase SQL Editor.');
        allGood = false;
      }
    }
  }
  if (allGood) {
    console.log('[startup] All database tables verified.');
  } else {
    console.warn('[startup] Some features will be degraded until migrations are run. See warnings above.');
  }
}

async function startup() {
  await checkMigrations();
  try {
    const { startWorker } = await import('./services/jobQueue.js');
    startWorker();
  } catch (err) {
    console.warn('[startup] Job worker could not start:', err.message);
  }
  app.listen(PORT, () => {
    console.log('BookSphere server running on port ' + PORT);
  });
}

startup().catch(err => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});

export default app;
