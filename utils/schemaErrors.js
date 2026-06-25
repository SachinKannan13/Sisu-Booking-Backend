/**
 * True if `error` looks like "this table/column doesn't exist yet" rather
 * than a real failure — i.e. a migration hasn't been run against this
 * Supabase project yet. Mirrors the pattern already used in routes/profile.js
 * (isMissingProfileSchema) but shared across the Learning OS routes
 * (sources/learn/lab/books), which all depend on migrations 007-010 that
 * are applied manually and may not exist yet on a given install.
 */
export function isMissingSchema(error) {
  if (!error) return false;
  if (['PGRST116', 'PGRST205', 'PGRST204', '42P01'].includes(error.code)) return true;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('could not find');
}
