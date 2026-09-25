import React, { useEffect, useState } from 'react';
import { Activity, Trophy, Users, Wifi } from 'lucide-react';
import { isLocalMode, requireSupabase, getLocalState } from '../lib/supabase';

export default function DashboardPage() {
  const [debate, setDebate] = useState(null), [counts, setCounts] = useState({ votes_a: 0, votes_b: 0 }), [connected, setConnected] = useState(false);

  async function load() {
    if (isLocalMode) {
      const s = getLocalState();
      const liveDebate = s.debates.find(d => d.status === 'live');
      setDebate(liveDebate || null);
      if (liveDebate) {
        const votesForD = s.votes.filter(v => v.debate_id === liveDebate.id);
        setCounts({
          votes_a: votesForD.filter(v => v.voted_for === 'A').length,
          votes_b: votesForD.filter(v => v.voted_for === 'B').length
        });
      }
      setConnected(true);
      return;
    }
    const supabase = requireSupabase(); 
    const { data: d } = await supabase.from('debates').select('*').eq('status', 'live').maybeSingle();
    setDebate(d || null);
    if (d) {
      const { data: cData } = await supabase.from('public_vote_counts').select('*').eq('debate_id', d.id).maybeSingle();
      setCounts(cData ? { votes_a: Number(cData.votes_a), votes_b: Number(cData.votes_b) } : { votes_a: 0, votes_b: 0 });
    }
    setConnected(true);
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
    const channel = supabase.channel('dashboard-debate-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, triggerLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debates' }, triggerLoad)
      .subscribe(s => {
        if (s === 'SUBSCRIBED') {
          setConnected(true);
          triggerLoad();
        } else {
          setConnected(false);
        }
      });
      
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!debate) return <section className="dashboard"><div className="center-card"><h2>No live debate</h2><p>Wait for the admin to start a debate.</p></div></section>;

  const total = counts.votes_a + counts.votes_b;
  const max = Math.max(counts.votes_a, counts.votes_b);
  const aLead = counts.votes_a > counts.votes_b;
  const bLead = counts.votes_b > counts.votes_a;

  return (
    <section className="dashboard">
      <div className="dashboard-top">
        <div>
          <span className="eyebrow">ABHIVRIDDHI • LIVE DASHBOARD</span>
          <h1>{debate.round_name}</h1>
          <p>{debate.topic}</p>
        </div>
        <div className="live-indicator"><span/> LIVE</div>
      </div>
      
      <div className="stats-row">
        <div className="stat"><Users/><span>Total votes</span><b>{total}</b></div>
        <div className="stat"><Trophy/><span>Current lead</span><b>{total === 0 ? '—' : (aLead ? debate.participant_a : (bLead ? debate.participant_b : 'Tie'))}</b></div>
        <div className="stat"><Wifi/><span>Realtime</span><b>{connected ? 'Connected' : 'Connecting…'}</b></div>
      </div>
      
      <div className="versus-board">
        <div className={`participant ${aLead && total > 0 ? 'leader' : ''}`}>
          <div className="rank">{aLead && total > 0 ? 'LEADING' : ''}</div>
          <h2>{debate.participant_a}</h2>
          <p>Participant A</p>
          <div className="big-count">{counts.votes_a}</div>
          <span className="votes-label">VOTES</span>
          <div className="bar"><span style={{ width: `${max ? Math.max(4, (counts.votes_a / max) * 100) : 0}%` }}/></div>
        </div>
        <div className="vs">VS</div>
        <div className={`participant ${bLead && total > 0 ? 'leader' : ''}`}>
          <div className="rank">{bLead && total > 0 ? 'LEADING' : ''}</div>
          <h2>{debate.participant_b}</h2>
          <p>Participant B</p>
          <div className="big-count">{counts.votes_b}</div>
          <span className="votes-label">VOTES</span>
          <div className="bar"><span style={{ width: `${max ? Math.max(4, (counts.votes_b / max) * 100) : 0}%` }}/></div>
        </div>
      </div>
      
      <div className="dashboard-note">
        <Activity size={18}/> Live results update automatically. The participant with the highest vote count stays highlighted with a green boundary.
      </div>
    </section>
  );
}
