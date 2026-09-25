import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

export default function Layout({ children, compact=false, management=false }) {
  const location = useLocation();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo small={compact} />
        {management && !compact && (
          <nav className="nav management-nav">
            <Link className={location.pathname === '/admin' ? 'active' : ''} to="/admin"><ShieldCheck size={17}/> Admin</Link>
            <Link className={location.pathname === '/dashboard' ? 'active' : ''} to="/dashboard"><BarChart3 size={17}/> Live Dashboard</Link>
          </nav>
        )}
      </header>
      <main className="page">{children}</main>
      <footer>Abhivriddhi • Secure event voting</footer>
    </div>
  );
}
