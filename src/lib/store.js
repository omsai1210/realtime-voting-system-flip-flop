/**
 * src/lib/store.js
 *
 * Centralized localStorage state management.
 * Replaces both Supabase and the previous /api backend.
 *
 * Storage keys:
 *   abhivriddhi_state       — debates, votes (shared across tabs)
 *   abhivriddhi_voter       — currently logged-in voter email
 *   abhivriddhi_admin       — 'true' if admin is logged in
 */

const STATE_KEY  = 'abhivriddhi_state';
const VOTER_KEY  = 'abhivriddhi_voter';
const ADMIN_KEY  = 'abhivriddhi_admin';

// ── Debate / Vote state ───────────────────────────────────────────────────────

const DEFAULT_STATE = {
  debates: [],
  votes: [],   // [{ debate_id, voter_email, voted_for }]
};

export function getState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch { /* ignore parse errors */ }
  return { ...DEFAULT_STATE };
}

export function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  // Notify all listeners (including other tabs via storage event)
  window.dispatchEvent(new Event('abhivriddhi-update'));
}

// ── Voter session ─────────────────────────────────────────────────────────────

export function getVoterEmail() {
  return localStorage.getItem(VOTER_KEY) || null;
}

export function setVoterEmail(email) {
  localStorage.setItem(VOTER_KEY, email);
}

export function clearVoterEmail() {
  localStorage.removeItem(VOTER_KEY);
}

// ── Admin session ─────────────────────────────────────────────────────────────

export function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_KEY) === 'true';
}

export function setAdminLoggedIn(value) {
  if (value) localStorage.setItem(ADMIN_KEY, 'true');
  else localStorage.removeItem(ADMIN_KEY);
}

// ── Debate helpers ────────────────────────────────────────────────────────────

export function getLiveDebate() {
  return getState().debates.find(d => d.status === 'live') || null;
}

export function getVoteCounts(debateId) {
  const votes = getState().votes.filter(v => v.debate_id === debateId);
  return {
    votes_a: votes.filter(v => v.voted_for === 'A').length,
    votes_b: votes.filter(v => v.voted_for === 'B').length,
  };
}

export function hasVotedInDebate(debateId, voterEmail) {
  return getState().votes.some(
    v => v.debate_id === debateId && v.voter_email === voterEmail
  );
}
