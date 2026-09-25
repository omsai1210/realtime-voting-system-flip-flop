import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, LockKeyhole, Vote, ArrowRight, User, LogOut, Activity } from 'lucide-react';
import { isLocalMode, requireSupabase, getLocalState, saveLocalState } from '../lib/supabase';

export default function VotePage() {
  const [debate, setDebate] = useState(null);
  const [email, setEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [connected, setConnected] = useState(false);

  async function load() {
    // Check if there is an active session
    const sessionEmail = sessionStorage.getItem('voter_email');
    if (sessionEmail) {
      setVerified(true);
      setEmail(sessionEmail);
    } else {
      setVerified(false);
    }

    if (isLocalMode) { 
      const s = getLocalState(); 
      const liveDebate = s.debates.find(d => d.status === 'live');
      setDebate(liveDebate || null);
      if (sessionEmail && liveDebate) {
        const vote = s.votes.find(v => v.debate_id === liveDebate.id && v.voter_email === sessionEmail);
        if (vote) setHasVoted(true);
        else setHasVoted(false);
      }
      setConnected(true);
      return; 
    }

    try {
      const supabase = requireSupabase();
      const { data: d } = await supabase.from('debates').select('*').eq('status', 'live').maybeSingle();
      setDebate(d || null);
      
      if (sessionEmail && d) {
        // Check if user already voted in this debate
        const { data: voteData } = await supabase.from('votes').select('*').eq('debate_id', d.id).eq('voter_email', sessionEmail).maybeSingle();
        if (voteData) {
          setHasVoted(true);
        } else {
          setHasVoted(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { 
    let isMounted = true;
    
    // Create a safe wrapped load function for event listeners
    const triggerLoad = () => {
      if (isMounted) load();
    };

    triggerLoad(); 

    if (isLocalMode) {
      window.addEventListener('abhivriddhi-local-update', triggerLoad); 
      // Listen to cross-tab localStorage changes (essential for local testing!)
      window.addEventListener('storage', triggerLoad);
      return () => {
        isMounted = false;
        window.removeEventListener('abhivriddhi-local-update', triggerLoad);
        window.removeEventListener('storage', triggerLoad);
      };
    }

    const supabase = requireSupabase();
    
    // Realtime subscription to any debate changes
    const channel = supabase.channel('participant-debate-status')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'debates' }, 
        (payload) => {
           console.log('Realtime event received:', payload);
           triggerLoad();
        }
      )
      .subscribe((status) => {
         if (status === 'SUBSCRIBED') {
           setConnected(true);
           triggerLoad(); // fetch latest state upon successful reconnect
         } else {
           setConnected(false);
         }
      });
      
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [verified]);

  async function checkEmail(e) {
    e.preventDefault(); setMessage(''); setBusy(true);
    try {
      const normalized = email.trim().toLowerCase();
      if (isLocalMode) {
        const s = getLocalState();
        if (!s.approvedEmails.includes(normalized)) throw new Error('This email is not registered for the event.');
        sessionStorage.setItem('voter_email', normalized);
        setVerified(true);
        setEmail(normalized);
        load();
      } else {
        const supabase = requireSupabase();
        const { data: allowed, error } = await supabase.rpc('check_allowed_email', { p_email: normalized });
        if (error) throw error;
        if (!allowed) throw new Error('This email is not registered for the event.');
        
        sessionStorage.setItem('voter_email', normalized);
        setVerified(true);
        setEmail(normalized);
        load();
      }
    } catch(err) { setMessage(err.message) } finally { setBusy(false) }
  }

  function logout() {
    sessionStorage.removeItem('voter_email');
    setVerified(false);
    setEmail('');
    setHasVoted(false);
    setSelected(null);
    setMessage('');
  }

  async function submitVote() {
    if (!selected || !verified || !debate) return; 
    setBusy(true); setMessage('');
    try {
      if (isLocalMode) {
        const s = getLocalState();
        const existingVote = s.votes.find(v => v.debate_id === debate.id && v.voter_email === email);
        if (existingVote) throw new Error('Your vote has already been recorded. You cannot vote again.');
        s.votes.push({ debate_id: debate.id, voter_email: email, voted_for: selected });
        saveLocalState(s); 
        setHasVoted(true);
        setMessage('Your vote has already been recorded. You cannot vote again.');
      } else {
        const supabase = requireSupabase(); 
        const { error } = await supabase.from('votes').insert({ debate_id: debate.id, voter_email: email, voted_for: selected });
        if (error) {
          if (error.code === '23505') throw new Error('Your vote has already been recorded. You cannot vote again.');
          throw error;
        }
        setHasVoted(true);
        setMessage('Your vote has already been recorded. You cannot vote again.');
      }
    } catch(err) { setMessage(err.message) } finally { setBusy(false) }
  }

  const ConnectionIndicator = () => (
    <div style={{ fontSize: '13px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: connected ? '#10b981' : '#f59e0b' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: connected ? '#10b981' : '#f59e0b', animation: connected ? 'none' : 'pulse 1.5s infinite' }}></div>
      {connected ? '🟢 Live connection' : '🔄 Reconnecting...'}
    </div>
  );

  return (
    <section className="vote-page">
      <div className="hero-card" style={{ textAlign: 'center', position: 'relative' }}>
        {verified && (
          <button className="text-btn" onClick={logout} style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
        <form className="form-card" onSubmit={checkEmail}>
          <div className="step-number">LOGIN</div>
          <h2>Participant Login</h2>
          <p>Enter your registered email address to continue.</p>
          <label>Email address</label>
          <div className="input-icon">
            <Mail size={18}/>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/>
          </div>
          <button className="primary" disabled={busy}>{busy ? 'Checking…' : 'Continue'} <ArrowRight size={18}/></button>
          {message && <div className={`notice ${message.startsWith('This email is not') ? 'error-notice' : ''}`}>{message}</div>}
        </form>
      ) : !debate ? (
        <div className="center-card">
          <Activity size={34} style={{ color: '#64748b', marginBottom: '10px' }} />
          <h2>No debate is currently live.</h2>
          <p>Please wait for the admin to start the next round.</p>
          <ConnectionIndicator />
        </div>
      ) : hasVoted ? (
        <div className="center-card success">
          <CheckCircle2 size={52}/>
          <h2>Vote submitted</h2>
          <p>Your vote has already been recorded. You cannot vote again.</p>
          <p className="muted">Thank you for participating in {debate.round_name}.</p>
          <ConnectionIndicator />
        </div>
      ) : !debate.voting_open ? (
        <div className="center-card">
          <LockKeyhole size={34}/>
          <h2>Voting is currently closed.</h2>
          <p>Current debate is in progress. Voting will open once the debate is completed.</p>
          <ConnectionIndicator />
        </div>
      ) : (
        <div className="vote-card">
          <div className="vote-head">
            <div>
              <span className="eyebrow">YOUR VOTE</span>
              <h2>Select one participant</h2>
            </div>
            <span className="verified" style={{ background: '#f1f5f9', color: '#475569' }}><CheckCircle2 size={17}/> {email}</span>
          </div>
          <div className="candidate-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button type="button" className={`candidate ${selected === 'A' ? 'selected' : ''}`} onClick={() => setSelected('A')}>
              <User size={34} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <span className="candidate-name">{debate.participant_a}</span>
              <span className="candidate-role">Participant A</span>
              {selected === 'A' && <span className="check"><CheckCircle2 size={20}/></span>}
            </button>
            <button type="button" className={`candidate ${selected === 'B' ? 'selected' : ''}`} onClick={() => setSelected('B')}>
              <User size={34} style={{ opacity: 0.5, marginBottom: '10px' }} />
              <span className="candidate-name">{debate.participant_b}</span>
              <span className="candidate-role">Participant B</span>
              {selected === 'B' && <span className="check"><CheckCircle2 size={20}/></span>}
            </button>
          </div>
          <button className="primary wide" disabled={!selected || busy} onClick={submitVote}>
            {busy ? 'Submitting…' : 'Submit final vote'} <Vote size={18}/>
          </button>
          {message && <div className="notice">{message}</div>}
          <p className="locked-note"><LockKeyhole size={14}/> You can vote only once. Your vote cannot be changed after submission.</p>
          <ConnectionIndicator />
        </div>
      )}
    </section>
  );
}
