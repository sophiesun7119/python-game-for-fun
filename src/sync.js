// Optional cloud progress sync (Supabase).
//
// Local storage is always the source of truth for the game; this module
// only sends a copy of a quest snapshot so the teacher can follow along
// in the Supabase dashboard (view: progress_latest). The table accepts
// anonymous INSERTs only — nothing can be read back through this key.
//
// Sync is active on the published site, or anywhere when local storage
// has pqSync = "on" (used for local testing). Every failure is ignored:
// a student never notices whether sync worked.
const SUPABASE_URL = 'https://delpcanykrobigufyomd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbHBjYW55a3JvYmlndWZ5b21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3OTc4ODQsImV4cCI6MjExMDM3Mzg4NH0.d6wZSQH0LZ8Z85FPKrtRumEmh5C0pgQSI8S8ET7znF4';

export function syncEnabled() {
  try {
    return location.hostname === 'sophiesun7119.github.io' || localStorage.getItem('pqSync') === 'on';
  } catch {
    return false;
  }
}

export function syncProgress(event) {
  if (!syncEnabled()) return;
  try {
    fetch(SUPABASE_URL + '/rest/v1/progress_events', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Sync must never break the game.
  }
}
