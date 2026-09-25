import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Layout from './components/Layout';
import VotePage from './pages/VotePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import { isLocalMode, requireSupabase } from './lib/supabase';

function ManagementGate({ children }) {
  const [state, setState] = useState('checking');

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (isLocalMode) {
        if (sessionStorage.getItem('abhivriddhi_admin') === 'true') setState('allowed');
        else setState('login');
        return;
      }
      try {
        const supabase = requireSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { if (mounted) setState('login'); return; }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (mounted) setState(profile?.role === 'admin' ? 'allowed' : 'denied');
      } catch { if (mounted) setState('denied'); }
    }
    check();
    return () => { mounted = false; };
  }, []);

  if (state === 'checking') return <Layout compact><div className="center-card">Checking management access…</div></Layout>;
  if (state === 'allowed') return children;
  if (state === 'login') return <Layout management><section className="access-card"><ShieldIcon/><h1>Management access</h1><p>Admin and live dashboard are restricted to the management team.</p><Link className="primary access-link" to="/admin">Go to Admin Login</Link></section></Layout>;
  return <Layout compact><section className="access-card"><ShieldIcon/><h1>Access restricted</h1><p>This area is available only to the authorized management team.</p><Link className="primary access-link" to="/vote">Return to voting</Link></section></Layout>;
}

function ShieldIcon() { return <div className="access-icon">🔒</div>; }

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vote" replace />} />
      <Route path="/vote" element={<Layout><VotePage /></Layout>} />
      <Route path="/admin" element={<Layout management><AdminPage /></Layout>} />
      <Route path="/dashboard" element={<ManagementGate><Layout management><DashboardPage /></Layout></ManagementGate>} />
      <Route path="*" element={<Navigate to="/vote" replace />} />
    </Routes>
  );
}
