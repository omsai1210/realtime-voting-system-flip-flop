import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Trophy, Users } from 'lucide-react';
import { getLiveDebate, getVoteCounts } from '../lib/store.js';

export default function DashboardPage() {
  const [debate, setDebate] = useState(null);
  const [counts, setCounts] = useState({ votes_a: 0, votes_b: 0 });

  const load = useCallback(() => {
    const live = getLiveDebate();
    setDebate(live || null);
    if (live) setCounts(getVoteCounts(live.id));
    else setCounts({ votes_a: 0, votes_b: 0 });
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

  if (!debate) return (
    <section className="dashboard">
      <div className="center-card">
        <h2>No live debate</h2>
        <p>Wait for the admin to start a debate.</p>
      </div>
    </section>
  );

  const total = counts.votes_a + counts.votes_b;
  const max   = Math.max(counts.votes_a, counts.votes_b);
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
        <div className="stat"><Trophy/><span>Current lead</span>
          <b>{total === 0 ? '—' : (aLead ? debate.participant_a : (bLead ? debate.participant_b : 'Tie'))}</b>
        </div>
        <div className="stat"><Activity/><span>Updates</span><b>Live</b></div>
      </div>

      <div className="versus-board">
        <div className={`participant ${aLead && total > 0 ? 'leader' : ''}`}>
          <div className="rank">{aLead && total > 0 ? 'LEADING' : ''}</div>
          <h2>{debate.participant_a}</h2>
          <p>Participant A</p>
          <div className="big-count">{counts.votes_a}</div>
          <span className="votes-label">VOTES</span>
          <div className="bar">
            <span style={{ width: `${max ? Math.max(4, (counts.votes_a / max) * 100) : 0}%` }}/>
          </div>
        </div>
        <div className="vs">VS</div>
        <div className={`participant ${bLead && total > 0 ? 'leader' : ''}`}>
          <div className="rank">{bLead && total > 0 ? 'LEADING' : ''}</div>
          <h2>{debate.participant_b}</h2>
          <p>Participant B</p>
          <div className="big-count">{counts.votes_b}</div>
          <span className="votes-label">VOTES</span>
          <div className="bar">
            <span style={{ width: `${max ? Math.max(4, (counts.votes_b / max) * 100) : 0}%` }}/>
          </div>
        </div>
      </div>

      <div className="dashboard-note">
        <Activity size={18}/> Results update automatically when votes are cast on this device.
      </div>
    </section>
  );
}
