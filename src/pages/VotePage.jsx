import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Mail, LockKeyhole, Vote, ArrowRight, User, LogOut, Activity } from 'lucide-react';
import { isAuthorizedVoter } from '../config/voters.js';
import {
  getState, saveState,
  getVoterEmail, setVoterEmail, clearVoterEmail,
  getLiveDebate, hasVotedInDebate,
} from '../lib/store.js';

export default function VotePage() {
  const [email, setEmail]       = useState('');
  const [verified, setVerified] = useState(false);
  const [debate, setDebate]     = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage]   = useState('');
  const [isError, setIsError]   = useState(false);
  const [busy, setBusy]         = useState(false);

  // ── Load state from localStorage ──────────────────────────────────────────
  const load = useCallback(() => {
    const storedEmail = getVoterEmail();
    const live        = getLiveDebate();

    if (storedEmail) {
      setVerified(true);
      setEmail(storedEmail);
    }

    setDebate(live || null);

    if (storedEmail && live) {
      setHasVoted(hasVotedInDebate(live.id, storedEmail));
    } else {
      setHasVoted(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('abhivriddhi-update', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('abhivriddhi-update', handler);
      window.removeEventListener('storage', handler);
    };
  }, [load]);

  // ── Email check ────────────────────────────────────────────────────────────
  function handleCheckEmail(e) {
    e.preventDefault();
    setMessage(''); setIsError(false); setBusy(true);

    const normalized = email.trim().toLowerCase();

    if (!isAuthorizedVoter(normalized)) {
      setMessage('You are not authorized to vote. This email is not registered for the event.');
      setIsError(true);
      setBusy(false);
      return;
    }

    setVoterEmail(normalized);
    setEmail(normalized);
    setVerified(true);
    setBusy(false);
    load();
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function handleLogout() {
    clearVoterEmail();
    setVerified(false);
    setEmail('');
    setHasVoted(false);
    setSelected(null);
    setMessage('');
  }

  // ── Submit vote ────────────────────────────────────────────────────────────
  function handleSubmitVote() {
    if (!selected || !verified || !debate) return;
    setBusy(true); setMessage(''); setIsError(false);

    const state = getState();
    const alreadyVoted = state.votes.some(
      v => v.debate_id === debate.id && v.voter_email === email
    );

    if (alreadyVoted) {
      setMessage('Your vote has already been recorded. You cannot vote again.');
      setHasVoted(true);
      setBusy(false);
      return;
    }

    state.votes.push({ debate_id: debate.id, voter_email: email, voted_for: selected });
    saveState(state);
    setHasVoted(true);
    setBusy(false);
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <section className="vote-page">
      <div className="hero-card" style={{ textAlign: 'center', position: 'relative' }}>
        {verified && (
          <button className="text-btn" onClick={handleLogout}
            style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LogOut size={16} /> Logout
          </button>
        )}
        <div>
          <span className="eyebrow">FLIP-FLOP DEBATE • ABHIVRIDDHI</span>
          <h1>{verified && debate ? debate.round_name : 'Participant Portal'}</h1>
          <p>{verified && debate ? debate.topic : 'Secure event voting interface.'}</p>
        </div>
        {verified && debate && (
          <div className={`status-pill ${debate.voting_open ? 'open' : 'closed'}`}>
            {debate.voting_open ? '● Voting Open' : '● Debate in Progress'}
          </div>
        )}
      </div>

      {!verified ? (
        /* ── Email login form ── */
        <form className="form-card" onSubmit={handleCheckEmail}>
          <div className="step-number">LOGIN</div>
          <h2>Participant Login</h2>
          <p>Enter your registered email address to continue.</p>
          <label>Email address</label>
          <div className="input-icon">
            <Mail size={18}/>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <button className="primary" disabled={busy}>
            {busy ? 'Checking…' : 'Continue'} <ArrowRight size={18}/>
          </button>
          {message && (
            <div className={`notice ${isError ? 'error-notice' : ''}`}>{message}</div>
          )}
        </form>

      ) : !debate ? (
        /* ── No live debate ── */
        <div className="center-card">
          <Activity size={34} style={{ color: '#64748b', marginBottom: '10px' }} />
          <h2>No debate is currently live.</h2>
          <p>Please wait for the admin to start the next round.</p>
        </div>

      ) : hasVoted ? (
        /* ── Already voted ── */
        <div className="center-card success">
          <CheckCircle2 size={52}/>
          <h2>Vote submitted</h2>
          <p>Your vote has already been recorded. You cannot vote again.</p>
          <p className="muted">Thank you for participating in {debate.round_name}.</p>
        </div>

      ) : !debate.voting_open ? (
        /* ── Voting closed ── */
        <div className="center-card">
          <LockKeyhole size={34}/>
          <h2>Voting is currently closed.</h2>
          <p>Current debate is in progress. Voting will open once the debate is completed.</p>
        </div>

      ) : (
        /* ── Vote card ── */
        <div className="vote-card">
          <div className="vote-head">
            <div>
              <span className="eyebrow">YOUR VOTE</span>
              <h2>Select one participant</h2>
            </div>
            <span className="verified" style={{ background: '#f1f5f9', color: '#475569' }}>
              <CheckCircle2 size={17}/> {email}
            </span>
          </div>
          <div className="candidate-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button type="button"
              className={`candidate ${selected === 'A' ? 'selected' : ''}`}
              onClick={() => setSelected('A')}>
              <User size={34} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <span className="candidate-name">{debate.participant_a}</span>
              <span className="candidate-role">Participant A</span>
              {selected === 'A' && <span className="check"><CheckCircle2 size={20}/></span>}
            </button>
            <button type="button"
              className={`candidate ${selected === 'B' ? 'selected' : ''}`}
              onClick={() => setSelected('B')}>
              <User size={34} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <span className="candidate-name">{debate.participant_b}</span>
              <span className="candidate-role">Participant B</span>
              {selected === 'B' && <span className="check"><CheckCircle2 size={20}/></span>}
            </button>
          </div>
          <button className="primary wide" disabled={!selected || busy} onClick={handleSubmitVote}>
            {busy ? 'Submitting…' : 'Submit final vote'} <Vote size={18}/>
          </button>
          {message && <div className="notice">{message}</div>}
          <p className="locked-note">
            <LockKeyhole size={14}/> You can vote only once. Your vote cannot be changed after submission.
          </p>
        </div>
      )}
    </section>
  );
}
