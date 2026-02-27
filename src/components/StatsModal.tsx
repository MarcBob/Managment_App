import { X, BarChart2, TrendingUp, Users, GitMerge, EyeOff } from 'lucide-react';
import type { OrgNode, OrgEdge } from '../utils/csvParser';
import type { NodeFilter, FilterGroup } from '../utils/nodeFilters';
import { calculateOrgStats } from '../utils/orgStats';
import { getAllFiltersWithStatus } from '../utils/nodeFilters';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: OrgNode[];
  edges: OrgEdge[];
  scratchpadFilters: NodeFilter[];
  filterGroups: FilterGroup[];
}

export const StatsModal = ({
  isOpen,
  onClose,
  nodes,
  edges,
  scratchpadFilters,
  filterGroups,
}: StatsModalProps) => {
  if (!isOpen) return null;

  const allGroups = getAllFiltersWithStatus(scratchpadFilters, filterGroups);
  const stats = calculateOrgStats(nodes, edges, allGroups);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-slate-600" />
            <h3 className="font-bold text-slate-800">Organization Statistics</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Main Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Users size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Positions</span>
              </div>
              <div className="text-2xl font-black text-blue-900">{stats.nodeCount}</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <TrendingUp size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Org Depth</span>
              </div>
              <div className="text-2xl font-black text-emerald-900">{stats.depth}</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <GitMerge size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Min Span</span>
              </div>
              <div className="text-2xl font-black text-amber-900">{stats.minSpan}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <GitMerge size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Max Span</span>
              </div>
              <div className="text-2xl font-black text-purple-900">{stats.maxSpan}</div>
            </div>
          </div>

          {/* Filter Counts */}
          <div className="space-y-6">
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700">Filter Distribution</label>
              <p className="text-xs text-slate-500 mt-1">
                Number of positions matching each color filter string, grouped by category.
              </p>
            </div>

            <div className="space-y-6">
              {stats.groupedFilterCounts.length > 0 ? (
                stats.groupedFilterCounts.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className={`text-[10px] font-black uppercase tracking-widest ${group.isActive ? 'text-slate-400' : 'text-slate-300'}`}>
                        {group.name}
                      </div>
                      <div className="flex-1 h-px bg-slate-100" />
                      {!group.isActive && <span className="text-[9px] font-bold text-slate-300 uppercase">Disabled</span>}
                    </div>
                    
                    <div className="space-y-2">
                      {group.filterCounts.map((fc) => (
                        <div 
                          key={`${group.id}-${fc.id}-${fc.pattern}`} 
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            fc.isActive 
                              ? "bg-slate-50 border-slate-100" 
                              : "bg-slate-50/50 border-slate-100 border-dashed opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full border border-slate-200" 
                              style={{ backgroundColor: fc.color }}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                {fc.pattern}
                                {!fc.isActive && <EyeOff size={12} className="text-slate-400" />}
                              </span>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                            {fc.count}
                          </span>
                        </div>
                      ))}

                      {/* Rest Label */}
                      <div className={`flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/30 transition-all ${!group.isActive && 'opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full border border-slate-200 bg-white" />
                          <span className="text-sm font-medium text-slate-500 italic">Rest (No match)</span>
                        </div>
                        <span className="text-sm font-bold text-slate-500 bg-white/50 px-2 py-0.5 rounded border border-slate-100">
                          {group.restCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm italic bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                  No color filters defined
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 border-t border-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-all shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
