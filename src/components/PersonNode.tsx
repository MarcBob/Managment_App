import { memo, useMemo, useContext, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { User, UserMinus, Plus, ChevronDown, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { getTeamColor, getContrastColor } from '../utils/colors';
import { MouseContext } from './OrgChart';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PersonNode = memo(({ data, id, xPos, yPos }: NodeProps) => {
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
    probationEndDate,
    customColor,
  } = data;

  const { mousePos, isSpacePressed } = useContext(MouseContext);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const scale = useMemo(() => {
    if (!isSpacePressed) return 1;
    
    // Node center
    const centerX = xPos + 120; // nodeWidth / 2
    const centerY = yPos + 75;  // nodeHeight / 2
    
    const dx = mousePos.x - centerX;
    const dy = mousePos.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const maxDistance = 400;
    const maxScale = 12.0;
    
    if (distance > maxDistance) return 1;
    
    // Linear interpolation: 1 at maxDistance, maxScale at 0 distance
    const factor = 1 - (distance / maxDistance);
    return 1 + (maxScale - 1) * factor;
  }, [isSpacePressed, mousePos, xPos, yPos]);

  // Force stacking order by manipulating the React Flow node wrapper's z-index
  useEffect(() => {
    const nodeElement = document.querySelector(`.react-flow__node[data-id="${id}"]`);
    if (nodeElement instanceof HTMLElement) {
      if (isSpacePressed && scale > 1) {
        // Use a high base and add scale-based priority
        nodeElement.style.zIndex = Math.round(scale * 1000).toString();
      } else {
        nodeElement.style.zIndex = '';
      }
    }
  }, [id, scale, isSpacePressed]);

  const isFilled = status === 'FILLED';
  const teamColorClass = getTeamColor(team).tailwind;
  const hasReports = directReportsCount > 0;

  const contrastColor = useMemo(() => getContrastColor(customColor), [customColor]);
  const isDark = customColor && contrastColor === 'white';

  const isFutureHire = useMemo(() => {
    if (!startDate) return false;
    const start = new Date(startDate);
    return start >= today;
  }, [startDate, today]);

  const hasExitDate = !!exitDate;

  const isOnProbation = useMemo(() => {
    if (!probationEndDate) return false;
    const end = new Date(probationEndDate);
    // On probation if today is <= probation end date
    return today <= end;
  }, [probationEndDate, today]);

  return (
    <div 
      className={cn(
        "px-4 py-3 shadow-lg rounded-lg border-2 w-[240px] transition-all duration-75 group relative cursor-pointer hover:border-blue-300 active:scale-95",
        isFilled ? (customColor ? "border-transparent" : teamColorClass) : "border-slate-200 border-dashed opacity-80",
        !customColor && "bg-white"
      )}
      style={{
        ...(customColor ? { backgroundColor: customColor } : {}),
        transform: `scale(${scale})`,
      }}
      onClick={() => onEditNode(id, data)}
    >
      {/* Date Labels */}
      <div className="absolute -top-3 left-2 flex flex-wrap gap-1 max-w-[220px]">
        {isFutureHire && (
          <div className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-emerald-600 whitespace-nowrap">
            <Calendar size={10} />
            Starts: {startDate}
          </div>
        )}
        {hasExitDate && (
          <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-rose-600 whitespace-nowrap">
            <Calendar size={10} />
            Exits: {exitDate}
          </div>
        )}
        {isOnProbation && (
          <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-amber-600 whitespace-nowrap">
            <AlertCircle size={10} />
            Probation: {probationEndDate}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-300" />
      
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          isFilled 
            ? (isDark ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600") 
            : "bg-slate-100 text-slate-400"
        )}>
          {isFilled ? <User size={20} /> : <UserMinus size={20} />}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className={cn(
            "text-sm font-bold truncate",
            isDark ? "text-white" : "text-slate-900"
          )}>
            {isFilled 
              ? `${firstName} ${lastName}` 
              : (firstName || lastName ? `${firstName} ${lastName}` : 'EMPTY POSITION')
            }
          </div>
          <div className={cn(
            "text-xs font-medium line-clamp-3 h-12 leading-4",
            isDark ? "text-white/80" : "text-slate-500"
          )}>
            {jobTitle}
          </div>
        </div>
      </div>
      
      <div className={cn(
        "mt-2 flex items-center justify-between border-t pt-2",
        isDark ? "border-white/20" : "border-slate-100"
      )}>
        <div className="flex items-center gap-2 overflow-hidden">
          {hasReports && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(id);
              }}
              className={cn(
                "p-1 rounded transition-colors",
                isDark ? "hover:bg-white/20 text-white/70" : "hover:bg-slate-100 text-slate-500"
              )}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <div className="overflow-hidden">
            {team && (
              <>
                <div className={cn(
                  "text-[10px] uppercase tracking-wider font-bold leading-none",
                  isDark ? "text-white/50" : "text-slate-400"
                )}>
                  Team
                </div>
                <div className={cn(
                  "text-xs font-medium truncate",
                  isDark ? "text-white/90" : "text-slate-600"
                )}>
                  {team}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isCollapsed && hasReports && (
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border",
              isDark 
                ? "bg-white/20 text-white border-white/30" 
                : "bg-blue-50 text-blue-700 border-blue-100"
            )}>
              <span>{directReportsCount}</span>
              <span className={isDark ? "text-white/40" : "text-blue-300"}>/</span>
              <span>{totalReportsCount}</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSubordinate(id);
            }}
            className={cn(
              "p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100",
              isDark 
                ? "bg-white/20 text-white hover:bg-white/40" 
                : "bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white"
            )}
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
