const TEAM_COLORS = [
  { tailwind: 'border-blue-400', hex: '#60a5fa' },
  { tailwind: 'border-emerald-400', hex: '#34d399' },
  { tailwind: 'border-violet-400', hex: '#a78bfa' },
  { tailwind: 'border-amber-400', hex: '#fbbf24' },
  { tailwind: 'border-rose-400', hex: '#fb7185' },
  { tailwind: 'border-cyan-400', hex: '#22d3ee' },
  { tailwind: 'border-indigo-400', hex: '#818cf8' },
];

export const getTeamColor = (team: string) => {
  if (!team) return { tailwind: 'border-slate-200', hex: '#e2e8f0' };
  
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
};

export const getContrastColor = (hexcolor: string): 'black' | 'white' => {
  // If no color provided, default to black (assuming light background)
  if (!hexcolor) return 'black';

  // Remove the hash if it exists
  const hex = hexcolor.replace('#', '');

  // Convert shorthand hex to full hex
  const fullHex = hex.length === 3 
    ? hex.split('').map(char => char + char).join('')
    : hex;

  // Convert to RGB
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Calculate luminance (using standard relative luminance formula)
  // 0.299*R + 0.587*G + 0.114*B
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? 'black' : 'white';
};
