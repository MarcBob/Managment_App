import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { getTeamColor } from '../utils/colors';

export const TeamGroupNode = memo(({ data }: NodeProps) => {
  const { team } = data;
  const { hex: color } = getTeamColor(team);
  
  return (
    <div 
      className="w-full h-full rounded-2xl border-2 border-dashed relative pointer-events-none"
      style={{
        borderColor: color,
        backgroundColor: `${color}10`, // 10 is hex for ~6% opacity
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      <div 
        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border whitespace-nowrap"
        style={{
          backgroundColor: 'white',
          borderColor: color,
          color: color,
        }}
      >
        {team}
      </div>
    </div>
  );
});
