import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLocalMode = !(url && key);
export const supabase = isLocalMode ? null : createClient(url, key);

export function requireSupabase() {
  if (!supabase) throw new Error('Voting service is currently unavailable. Please contact the event management team.');
  return supabase;
}

const KEY = 'abhivriddhi_local_state_v2';

export function getLocalState() {
  const saved = localStorage.getItem(KEY);
  if (saved) return JSON.parse(saved);

  const state = {
    debates: [],
    approvedEmails: [],
    verifiedEmails: [],
    votes: [] // { debate_id, voter_email, voted_for }
  };

  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function saveLocalState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('abhivriddhi-local-update'));
}
