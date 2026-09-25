import React, { useEffect, useState, useCallback } from 'react';
import { FileSpreadsheet, Lock, LogOut, Plus, Upload, Play, Square, Unlock, LockKeyhole } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/admin.js';
import {
  getState, saveState,
  isAdminLoggedIn, setAdminLoggedIn,
  getVoteCounts,
} from '../lib/store.js';

export default function AdminPage() {
  const [admin, setAdmin]               = useState(false);
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [debates, setDebates]           = useState([]);
  const [counts, setCounts]             = useState({});
  const [voterCount, setVoterCount]     = useState(0);
  const [msg, setMsg]                   = useState('');
  const [isError, setIsError]           = useState(false);
  const [busy, setBusy]                 = useState(false);
  const [newRound, setNewRound]         = useState('Round 1');
  const [newTopic, setNewTopic]         = useState('');
  const [newA, setNewA]                 = useState('');
  const [newB, setNewB]                 = useState('');

  // ── Load data from localStorage ────────────────────────────────────────────
  const load = useCallback(() => {
    if (!isAdminLoggedIn()) return;
    const state = getState();
    setDebates(state.debates);
    setVoterCount(state.approvedEmails?.length || 0);

    const countsMap = {};
    state.debates.forEach(d => {
      countsMap[d.id] = getVoteCounts(d.id);
    });
    setCounts(countsMap);
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn()) { setAdmin(true); load(); }

    const handler = () => load();
    window.addEventListener('abhivriddhi-update', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('abhivriddhi-update', handler);
      window.removeEventListener('storage', handler);
    };
  }, [load]);

  // ── Admin login ────────────────────────────────────────────────────────────
  function handleLogin(e) {
    e.preventDefault();
    setMsg(''); setIsError(false); setBusy(true);

    if (
      email.trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase() ||
      password !== ADMIN_PASSWORD
    ) {
      setMsg('Invalid management credentials.'); setIsError(true); setBusy(false); return;
    }

    setAdminLoggedIn(true);
    setAdmin(true);
    setBusy(false);
    load();
  }

  // ── Admin logout ───────────────────────────────────────────────────────────
  function handleLogout() {
    setAdminLoggedIn(false);
    setAdmin(false);
    setEmail(''); setPassword('');
    setDebates([]); setCounts({});
  }

  // ── Create debate ──────────────────────────────────────────────────────────
  function handleCreateDebate(e) {
    e.preventDefault();
    if (!newRound.trim() || !newTopic.trim() || !newA.trim() || !newB.trim()) return;

    const state = getState();
    state.debates.unshift({
      id: crypto.randomUUID(),
      round_name: newRound.trim(),
      topic: newTopic.trim(),
      participant_a: newA.trim(),
      participant_b: newB.trim(),
      status: 'pending',
      voting_open: false,
      created_at: new Date().toISOString(),
    });
    saveState(state);
    setNewTopic(''); setNewA(''); setNewB('');
    load();
  }

  // ── Update debate ──────────────────────────────────────────────────────────
  function handleUpdateDebate(id, updates) {
    const state = getState();
    const debate = state.debates.find(d => d.id === id);
    if (!debate) return;

    // If making live, complete any existing live debate first
    if (updates.status === 'live') {
      state.debates.forEach(d => {
        if (d.id !== id && d.status === 'live') {
          d.status = 'completed';
          d.voting_open = false;
        }
      });
    }

    Object.assign(debate, updates);
    // If ending, also close voting
    if (updates.status === 'completed') debate.voting_open = false;

    saveState(state);
    load();
  }

  // ── Import emails from Excel ───────────────────────────────────────────────
  async function handleUploadExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(''); setIsError(false);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const emails = [...new Set(
        rows.flat()
          .map(x => String(x).trim().toLowerCase())
          .filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))
      )];
      if (!emails.length) throw new Error('No valid email addresses found in the first sheet.');

      const state = getState();
      state.approvedEmails = [...new Set([...(state.approvedEmails || []), ...emails])];
      saveState(state);
      setMsg(`${emails.length} approved email(s) imported successfully.`);
      load();
    } catch (err) {
      setMsg(err.message); setIsError(true);
    } finally {
      setBusy(false); e.target.value = '';
    }
  }

  // ── Login form ─────────────────────────────────────────────────────────────
  if (!admin) return (
    <section className="admin-login">
      <form className="form-card" onSubmit={handleLogin}>
        <div className="step-number">ADMIN</div>
        <h1>Admin control</h1>
        <p>Sign in with your authorized management account.</p>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Management email" required/>
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required/>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <Lock size={17}/></button>
        {msg && <div className={`notice ${isError ? 'error-notice' : ''}`}>{msg}</div>}
      </form>
    </section>
  );

  // ── Admin dashboard ────────────────────────────────────────────────────────
  return (
    <section className="admin">
      <div className="admin-head">
        <div>
          <span className="eyebrow">CONTROL CENTRE</span>
          <h1>Event administration</h1>
          <p>Manage the approved audience, debates, and live results.</p>
        </div>
        <button className="ghost" onClick={handleLogout}><LogOut size={17}/> Sign out</button>
      </div>

      {msg && <div className={`notice ${isError ? 'error-notice' : ''}`}>{msg}</div>}

      <div className="admin-grid">
        <div className="panel">
          <div className="panel-title"><FileSpreadsheet/><h2>Approved audience</h2></div>
          <p>{voterCount} approved email address{voterCount !== 1 ? 'es' : ''} (runtime import)</p>
          <label className="upload">
            <Upload size={18}/> Import Excel / CSV
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUploadExcel} hidden/>
          </label>
          <small>Upload the first sheet containing emails. Only valid email addresses are imported.</small>
        </div>

        <div className="panel">
          <div className="panel-title"><Plus/><h2>Create Debate</h2></div>
          <form onSubmit={handleCreateDebate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input value={newRound} onChange={e => setNewRound(e.target.value)} placeholder="Round Name (e.g., Round 1)" required/>
            <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Topic" required/>
            <input value={newA} onChange={e => setNewA(e.target.value)} placeholder="Participant A Name" required/>
            <input value={newB} onChange={e => setNewB(e.target.value)} placeholder="Participant B Name" required/>
            <button className="primary compact" type="submit"><Plus size={17}/> Add Debate</button>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h2>Debates &amp; Results</h2>
          <span className="muted">Manage live status and view reports.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {debates.map(d => {
            const cA = counts[d.id]?.votes_a || 0;
            const cB = counts[d.id]?.votes_b || 0;
            const total = cA + cB;
            return (
              <div key={d.id}
                style={{ border: `1px solid ${d.status === 'live' ? '#86efac' : '#ccc'}`, padding: '15px', borderRadius: '8px', background: d.status === 'live' ? '#f0fdf4' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>
                      {d.round_name}{' '}
                      <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{d.status}</span>
                    </h3>
                    <p style={{ margin: '0', fontWeight: 'bold' }}>{d.topic}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {d.status === 'pending' && (
                      <button className="outline-btn" onClick={() => handleUpdateDebate(d.id, { status: 'live' })}>
                        <Play size={16}/> Make Live
                      </button>
                    )}
                    {d.status === 'live' && !d.voting_open && (
                      <button className="outline-btn" onClick={() => handleUpdateDebate(d.id, { voting_open: true })}>
                        <Unlock size={16}/> Open Voting
                      </button>
                    )}
                    {d.status === 'live' && d.voting_open && (
                      <button className="outline-btn" onClick={() => handleUpdateDebate(d.id, { voting_open: false })}>
                        <LockKeyhole size={16}/> Close Voting
                      </button>
                    )}
                    {d.status === 'live' && (
                      <button className="outline-btn" onClick={() => handleUpdateDebate(d.id, { status: 'completed', voting_open: false })}>
                        <Square size={16}/> End Debate
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    <strong>{d.participant_a}</strong>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: cA > cB ? '#16a34a' : '#000' }}>{cA} votes</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    <strong>{d.participant_b}</strong>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: cB > cA ? '#16a34a' : '#000' }}>{cB} votes</div>
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#64748b' }}>Total Votes: {total}</div>
              </div>
            );
          })}
          {debates.length === 0 && <p style={{ color: '#64748b' }}>No debates created yet.</p>}
        </div>
      </div>
    </section>
  );
}
