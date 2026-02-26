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
