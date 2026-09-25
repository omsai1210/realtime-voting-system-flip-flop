import React from 'react';

export default function Logo({ small=false }) {
  return (
    <div className={`brand ${small ? 'brand-small' : ''}`}>
      <img src="/logo.png" alt="Abhivriddhi" />
      <div>
        <strong>abhivriddhi</strong>
        <span>Live Voting</span>
      </div>
    </div>
  );
}
