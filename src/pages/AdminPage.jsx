import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Lock, LogOut, Plus, Settings, Upload, Play, Square, Unlock, LockKeyhole, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { isLocalMode, requireSupabase, getLocalState, saveLocalState } from '../lib/supabase';

export default function AdminPage() {
  const [session, setSession] = useState(null), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [admin, setAdmin] = useState(false), [debates, setDebates] = useState([]), [whitelistCount, setWhitelistCount] = useState(0);
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const [newRound, setNewRound] = useState('Round 1'), [newTopic, setNewTopic] = useState(''), [newA, setNewA] = useState(''), [newB, setNewB] = useState('');
  const [counts, setCounts] = useState({});

  async function load() {
    if (isLocalMode) {
      const s = getLocalState();
      setDebates(s.debates);
      setWhitelistCount(s.approvedEmails.length);
      if (sessionStorage.getItem('abhivriddhi_admin') === 'true') {
        setAdmin(true);
        setSession({ local: true });
      }
      
      const countsMap = {};
      s.debates.forEach(d => {
        const votesForD = s.votes.filter(v => v.debate_id === d.id);
        countsMap[d.id] = {
          votes_a: votesForD.filter(v => v.voted_for === 'A').length,
          votes_b: votesForD.filter(v => v.voted_for === 'B').length
        };
      });
      setCounts(countsMap);
      return;
    }
    const supabase = requireSupabase();
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    if (!s) return;
    
    const { data: p } = await supabase.from('profiles').select('role').eq('id', s.user.id).single();
    if (p?.role !== 'admin') { setAdmin(false); setMsg('This account is not an admin.'); return; }
    
    setAdmin(true);
    const [{ data: dbs }, { count }] = await Promise.all([
      supabase.from('debates').select('*').order('created_at', { ascending: false }),
      supabase.from('approved_emails').select('*', { count: 'exact', head: true })
    ]);
    setDebates(dbs || []);
    setWhitelistCount(count || 0);

    const { data: cData } = await supabase.from('public_vote_counts').select('*');
    const map = {};
    (cData || []).forEach(r => map[r.debate_id] = { votes_a: Number(r.votes_a), votes_b: Number(r.votes_b) });
    setCounts(map);
  }

  useEffect(() => { 
    let isMounted = true;
    const triggerLoad = () => { if (isMounted) load(); };
    triggerLoad();
    
    if (isLocalMode) {
       window.addEventListener('abhivriddhi-local-update', triggerLoad); 
       window.addEventListener('storage', triggerLoad);
       return () => {
         isMounted = false;
         window.removeEventListener('abhivriddhi-local-update', triggerLoad);
         window.removeEventListener('storage', triggerLoad);
       };
    }
    
    const supabase = requireSupabase();
    const channel = supabase.channel('admin-debate-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, triggerLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debates' }, triggerLoad)
      .subscribe();
      
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function login(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    if (isLocalMode) {
      if (email.trim().toLowerCase() !== 'admin@abhivriddhi.local' || password !== 'admin123') {
        setMsg('Invalid management credentials.'); setBusy(false); return;
      }
      setAdmin(true); setSession({ local: true }); sessionStorage.setItem('abhivriddhi_admin', 'true'); setBusy(false); return;
    }
    const supabase = requireSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message); else await load();
    setBusy(false);
  }

  async function logout() {
    if (isLocalMode) { setAdmin(false); setSession(null); sessionStorage.removeItem('abhivriddhi_admin'); return; }
    await requireSupabase().auth.signOut(); setSession(null); setAdmin(false);
  }

  async function createDebate(e) {
    e.preventDefault();
    if (!newRound.trim() || !newTopic.trim() || !newA.trim() || !newB.trim()) return;
    if (isLocalMode) {
      const s = getLocalState();
      s.debates.unshift({ id: crypto.randomUUID(), round_name: newRound.trim(), topic: newTopic.trim(), participant_a: newA.trim(), participant_b: newB.trim(), status: 'pending', voting_open: false, created_at: new Date().toISOString() });
      saveLocalState(s);
      setNewTopic(''); setNewA(''); setNewB('');
      return;
    }
    const supabase = requireSupabase();
    const { error } = await supabase.from('debates').insert({ round_name: newRound.trim(), topic: newTopic.trim(), participant_a: newA.trim(), participant_b: newB.trim() });
    if (error) setMsg(error.message); else { setNewTopic(''); setNewA(''); setNewB(''); load(); }
  }

  async function updateDebate(id, updates) {
    if (isLocalMode) {
      const s = getLocalState();
      const db = s.debates.find(d => d.id === id);
      if (db) Object.assign(db, updates);
      if (updates.status === 'live') {
        s.debates.forEach(d => { if (d.id !== id && d.status === 'live') d.status = 'completed'; });
      }
      saveLocalState(s);
      return;
    }
    const supabase = requireSupabase();
    if (updates.status === 'live') {
      await supabase.from('debates').update({ status: 'completed' }).eq('status', 'live');
    }
    const { error } = await supabase.from('debates').update(updates).eq('id', id);
    if (error) setMsg(error.message); else load();
  }

  async function uploadExcel(e) {
    const file = e.target.files?.[0]; if (!file) return; setBusy(true); setMsg('');
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const emails = [...new Set(rows.flat().map(x => String(x).trim().toLowerCase()).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))];
      if (!emails.length) throw new Error('No valid email addresses found in the first sheet.');
      
      if (isLocalMode) {
        const s = getLocalState();
        s.approvedEmails = [...new Set([...s.approvedEmails, ...emails])];
        saveLocalState(s);
        setMsg(`${emails.length} approved email addresses imported successfully.`);
      } else {
        const { error } = await requireSupabase().from('approved_emails').upsert(emails.map(email => ({ email })), { onConflict: 'email' });
        if (error) throw error;
        setMsg(`${emails.length} approved emails imported.`); load();
      }
    } catch (err) { setMsg(err.message) } finally { setBusy(false); e.target.value = '' }
  }

  if (!admin) return (
    <section className="admin-login">
      <form className="form-card" onSubmit={login}>
        <div className="step-number">ADMIN</div>
        <h1>Admin control</h1>
        <p>Sign in with your authorized management account.</p>
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Management email" required/>
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required/>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <Lock size={17}/></button>
        {msg && <div className="notice">{msg}</div>}
      </form>
    </section>
  );

  return (
    <section className="admin">
      <div className="admin-head">
        <div>
          <span className="eyebrow">CONTROL CENTRE</span>
          <h1>Event administration</h1>
          <p>Manage the approved audience, debates, and live results.</p>
        </div>
        <button className="ghost" onClick={logout}><LogOut size={17}/> Sign out</button>
      </div>
      
      {msg && <div className="notice">{msg}</div>}
      
      <div className="admin-grid">
        <div className="panel">
          <div className="panel-title"><FileSpreadsheet/><h2>Approved audience</h2></div>
          <p>{whitelistCount} approved email addresses</p>
          <label className="upload">
            <Upload size={18}/> Import Excel / CSV
            <input type="file" accept=".xlsx,.xls,.csv" onChange={uploadExcel} hidden/>
          </label>
          <small>Upload the first sheet containing emails. Only valid email addresses are imported.</small>
        </div>

        <div className="panel">
          <div className="panel-title"><Plus/><h2>Create Debate</h2></div>
          <form onSubmit={createDebate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input value={newRound} onChange={e=>setNewRound(e.target.value)} placeholder="Round Name (e.g., Round 1)" required/>
            <input value={newTopic} onChange={e=>setNewTopic(e.target.value)} placeholder="Topic" required/>
            <input value={newA} onChange={e=>setNewA(e.target.value)} placeholder="Participant A Name" required/>
            <input value={newB} onChange={e=>setNewB(e.target.value)} placeholder="Participant B Name" required/>
            <button className="primary compact" type="submit"><Plus size={17}/> Add Debate</button>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title"><h2>Debates & Results</h2><span className="muted">Manage live status and view reports.</span></div>
        <div className="debates-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {debates.map(d => {
            const cA = counts[d.id]?.votes_a || 0;
            const cB = counts[d.id]?.votes_b || 0;
            const total = cA + cB;
            
            return (
              <div key={d.id} className={`admin-debate-card ${d.status === 'live' ? 'live-border' : ''}`} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: d.status === 'live' ? '#f0fdf4' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>{d.round_name} <span style={{ fontSize: '12px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{d.status}</span></h3>
                    <p style={{ margin: '5px 0', fontWeight: 'bold' }}>{d.topic}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {d.status === 'pending' && <button className="outline-btn" onClick={() => updateDebate(d.id, { status: 'live' })}><Play size={16}/> Make Live</button>}
                    {d.status === 'live' && !d.voting_open && <button className="outline-btn" onClick={() => updateDebate(d.id, { voting_open: true })}><Unlock size={16}/> Open Voting</button>}
                    {d.status === 'live' && d.voting_open && <button className="outline-btn" onClick={() => updateDebate(d.id, { voting_open: false })}><LockKeyhole size={16}/> Close Voting</button>}
                    {d.status === 'live' && <button className="outline-btn" onClick={() => updateDebate(d.id, { status: 'completed', voting_open: false })}><Square size={16}/> End Debate</button>}
                  </div>
                </div>
                
                <div style={{ marginTop: '15px', display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    <strong>{d.participant_a}</strong>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: cA > cB ? '#16a34a' : '#000' }}>{cA} votes</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    <strong>{d.participant_b}</strong>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: cB > cA ? '#16a34a' : '#000' }}>{cB} votes</div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#64748b' }}>Total Votes: {total}</div>
              </div>
            );
          })}
          {debates.length === 0 && <p>No debates created yet.</p>}
        </div>
      </div>
    </section>
  );
}
