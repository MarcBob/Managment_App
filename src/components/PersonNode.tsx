import { memo, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { User, UserMinus, Plus, Edit2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getTeamColor = (team: string) => {
  if (!team) return 'border-slate-200';
  const colors = [
    'border-blue-400',
    'border-emerald-400',
    'border-violet-400',
    'border-amber-400',
    'border-rose-400',
    'border-cyan-400',
    'border-indigo-400',
  ];
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const PersonNode = memo(({ data, id }: NodeProps) => {
  const { 
    firstName, 
    lastName, 
    jobTitle, 
    team, 
    status, 
    onAddSubordinate, 
    onEditNode,
    onToggleCollapse,
    isCollapsed,
    directReportsCount,
    totalReportsCount,
    startDate,
    exitDate,
  } = data;
  const isFilled = status === 'FILLED';
  const teamColor = getTeamColor(team);
  const hasReports = directReportsCount > 0;

  const isFutureHire = useMemo(() => {
    if (!startDate) return false;
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start >= today;
  }, [startDate]);

  const hasExitDate = !!exitDate;

  return (
    <div className={cn(
      "px-4 py-3 shadow-lg rounded-lg border-2 w-[240px] bg-white transition-all group relative",
      isFilled ? teamColor : "border-slate-200 border-dashed opacity-80"
    )}>
      {/* Date Labels */}
      <div className="absolute -top-3 left-2 flex gap-1">
        {isFutureHire && (
          <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-emerald-600">
            <Calendar size={10} />
            Starts: {startDate}
          </div>
        )}
        {hasExitDate && (
          <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-rose-600">
            <Calendar size={10} />
            Exits: {exitDate}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-300" />
      
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          isFilled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
        )}>
          {isFilled ? <User size={20} /> : <UserMinus size={20} />}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="text-sm font-bold text-slate-900 truncate">
            {isFilled ? `${firstName} ${lastName}` : 'EMPTY POSITION'}
          </div>
          <div className="text-xs font-medium text-slate-500 truncate">
            {jobTitle}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditNode(id, data);
          }}
          className="p-1.5 rounded-full text-slate-300 hover:bg-slate-100 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
          title="Edit Position"
        >
          <Edit2 size={14} />
        </button>
      </div>
      
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {hasReports && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(id);
              }}
              className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <div className="overflow-hidden">
            {team && (
              <>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none">
                  Team
                </div>
                <div className="text-xs text-slate-600 font-medium truncate">
                  {team}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isCollapsed && hasReports && (
            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100">
              <span>{directReportsCount}</span>
              <span className="text-blue-300">/</span>
              <span>{totalReportsCount}</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSubordinate(id);
            }}
            className="p-1.5 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="Add Subordinate"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-300" />
    </div>
  );
});
