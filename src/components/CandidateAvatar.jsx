import React from 'react';

const PALETTE = [
  ['#DFF3D8', '#3F7137'],
  ['#E7F0D9', '#557A36'],
  ['#D9EFE7', '#34705D'],
  ['#EDE8D8', '#766A3B'],
  ['#E4E9D7', '#4F6D3E'],
  ['#DCEDE2', '#3F6951']
];

function getIndex(value) {
  return [...String(value || 'Candidate')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PALETTE.length;
}

export default function CandidateAvatar({ seed = 'Candidate', size = 'md' }) {
  const name = String(seed || 'Candidate').trim();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'C';

  const [background, foreground] = PALETTE[getIndex(name)];

  return (
    <div
      className={`candidate-avatar ${size}`}
      style={{ '--avatar-bg': background, '--avatar-fg': foreground }}
      aria-label={`${name} avatar`}
      title={name}
    >
      <span>{initials}</span>
    </div>
  );
}
