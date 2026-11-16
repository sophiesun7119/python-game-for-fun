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

// Reads the latest quest snapshots and aggregates the public total-XP
// leaderboard (used on the game's home screen). Returns null when sync
// is disabled or the read fails.
export async function fetchLeaderboard() {
  if (!syncEnabled()) return null;
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/progress_latest?select=nickname,xp,solved', {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const byName = new Map();
    for (const r of rows) {
      const key = String(r.nickname || '').trim();
      if (!key) continue;
      const e = byName.get(key) || { nickname: key, xp: 0, solved: 0, quests: 0 };
      e.xp += r.xp || 0;
      e.solved += r.solved || 0;
      e.quests += 1;
      byName.set(key, e);
    }
    return [...byName.values()]
      .filter(e => e.xp > 0)
      .sort((a, b) => b.xp - a.xp || b.solved - a.solved || a.nickname.localeCompare(b.nickname));
  } catch {
    return null;
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
