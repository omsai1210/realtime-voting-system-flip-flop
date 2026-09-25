import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Layout from './components/Layout';
import VotePage from './pages/VotePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import { isAdminLoggedIn } from './lib/store.js';

/** Gate that protects /dashboard — only admins can access it. */
function ManagementGate({ children }) {
  const [state, setState] = useState('checking');

  useEffect(() => {
    setState(isAdminLoggedIn() ? 'allowed' : 'login');
  }, []);

  if (state === 'checking') {
    return <Layout compact><div className="center-card">Checking management access…</div></Layout>;
  }
  if (state === 'allowed') return children;
  return (
    <Layout management>
      <section className="access-card">
        <div className="access-icon">🔒</div>
        <h1>Management access</h1>
        <p>Admin and live dashboard are restricted to the management team.</p>
        <Link className="primary access-link" to="/admin">Go to Admin Login</Link>
      </section>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Navigate to="/vote" replace />} />
      <Route path="/vote"      element={<Layout><VotePage /></Layout>} />
      <Route path="/admin"     element={<Layout management><AdminPage /></Layout>} />
      <Route path="/dashboard" element={<ManagementGate><Layout management><DashboardPage /></Layout></ManagementGate>} />
      <Route path="*"          element={<Navigate to="/vote" replace />} />
    </Routes>
  );
}
