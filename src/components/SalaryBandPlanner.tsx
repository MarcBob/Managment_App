import React, { useState, useMemo } from 'react';
import { type JobFamily, type SalaryBand, calculateSubBands, calculateNextMidpoint, calculatePreviousMidpoint } from '../utils/salaryBands';
import { Plus, Trash2, ChevronRight, Calculator, BarChart3, ChevronDown, ChevronUp, Layers, Anchor } from 'lucide-react';

interface SalaryBandPlannerProps {
  jobFamilies: JobFamily[];
  onDataChange: (jobFamilies: JobFamily[]) => void;
}

interface JobFamilyOverviewProps {
  activeFamily: JobFamily;
}

const JobFamilyOverview: React.FC<JobFamilyOverviewProps> = ({ activeFamily }) => {
  const bands = activeFamily.salaryBands;
  if (bands.length === 0) return null;

  // Calculate overall range for the horizontal scale
  const bandData = bands.map(b => ({
    ...b,
    subBands: calculateSubBands(b.midpoint, b.spread)
  }));

  const minSalary = Math.min(...bandData.map(b => b.subBands[0].start));
  const maxSalary = Math.max(...bandData.map(b => b.subBands[3].end));
  const totalRange = maxSalary - minSalary;

  // Helper to get percentage position
  const getPos = (salary: number) => ((salary - minSalary) / totalRange) * 100;

  // Simple sort by midpoint to show progression
  const sortedBands = [...bandData].sort((a, b) => a.midpoint - b.midpoint);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-8 overflow-x-auto">
      <div className="min-w-[900px] pl-36 space-y-4">
        {/* Salary Scale Header */}
        <div className="relative h-6 border-b border-slate-100 mb-6">
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const val = minSalary + totalRange * pct;
            return (
              <div 
                key={pct} 
                className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                style={{ left: `${pct * 100}%` }}
              >
                <div className="h-2 w-px bg-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 mt-1">${Math.round(val).toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        {/* Level Bars */}
        {sortedBands.map((band, idx) => (
          <div key={band.id} className="relative h-8 group">
            <div className="absolute left-0 -translate-x-full pr-4 w-32 text-right truncate text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-8">
              {band.name}
            </div>
            <div 
              className="absolute h-full rounded-md overflow-hidden border border-white/40 shadow-sm flex"
              style={{ 
                left: `${getPos(band.subBands[0].start)}%`, 
                width: `${getPos(band.subBands[3].end) - getPos(band.subBands[0].start)}%` 
              }}
            >
              {band.subBands.map((sub, sIdx) => (
                <div 
                  key={sub.name}
                  className={`h-full border-r last:border-r-0 border-white/20 ${
                    sIdx === 0 ? 'bg-blue-100' : 
                    sIdx === 1 ? 'bg-blue-200' : 
                    sIdx === 2 ? 'bg-blue-300' : 
                    'bg-blue-400'
                  }`}
                  style={{ width: '25%' }}
                  title={`${band.name} - ${sub.name}: $${Math.round(sub.start).toLocaleString()} - $${Math.round(sub.end).toLocaleString()}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface BandCardProps {
  band: SalaryBand;
  activeFamily: JobFamily;
  onUpdateBand: (bandId: string, updates: Partial<SalaryBand>) => void;
  onToggleAutoCalc: (bandId: string) => void;
  onSetLeading: (bandId: string) => void;
  onAddBand: (parentId: string) => void;
  onRemoveBand: (bandId: string) => void;
}

const BandCard: React.FC<BandCardProps> = ({ 
  band, 
  activeFamily, 
  onUpdateBand, 
  onToggleAutoCalc, 
  onSetLeading,
  onAddBand, 
  onRemoveBand 
}) => {
  const subBands = calculateSubBands(band.midpoint, band.spread);
  const parent = activeFamily.salaryBands.find(b => b.id === band.parentId);

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden mb-6 transition-all ${band.isLeading && !band.isAutoCalculated ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200'}`}>
      <div className={`p-4 border-b flex items-center justify-between ${band.isLeading && !band.isAutoCalculated ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <input 
            type="text"
            value={band.name}
            onChange={(e) => onUpdateBand(band.id, { name: e.target.value })}
            className="bg-transparent font-bold text-slate-800 border-none focus:ring-0 p-0 text-lg w-48"
          />
          {parent && (
            <div className="flex items-center text-slate-400 text-xs font-medium uppercase tracking-wider gap-1">
              <ChevronRight className="h-3 w-3" />
              Next from {parent.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!band.isAutoCalculated && (
            <button
              onClick={() => onSetLeading(band.id)}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
                band.isLeading 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
              }`}
              title={band.isLeading ? 'Leading Node (Anchor)' : 'Set as Leading Node'}
            >
              <Anchor className="h-3.5 w-3.5" />
              LEADER
            </button>
          )}
          <button 
            onClick={() => onToggleAutoCalc(band.id)}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
              band.isAutoCalculated 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            title={band.isAutoCalculated ? 'Auto-calculation ON' : 'Auto-calculation OFF'}
          >
            <Calculator className="h-3.5 w-3.5" />
            AUTO
          </button>
          <button 
            onClick={() => onAddBand(band.id)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Add Level Below"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button 
            onClick={() => onRemoveBand(band.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove Level"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Midpoint (100%)</label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">$</span>
              <input 
                type="number"
                value={Math.round(band.midpoint) || ''}
                disabled={band.isAutoCalculated}
                onChange={(e) => onUpdateBand(band.id, { midpoint: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Spread (%)</label>
            <div className="flex items-center gap-2">
              <input 
                type="number"
                step="0.1"
                value={band.spread * 100 || ''}
                disabled={band.isAutoCalculated}
                onChange={(e) => onUpdateBand(band.id, { spread: (parseFloat(e.target.value) || 0) / 100 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
              />
              <span className="text-slate-400 font-medium">%</span>
            </div>
          </div>
          <div className="flex flex-col justify-end">
             <div className="text-[10px] text-slate-400 italic leading-tight">
               {band.isAutoCalculated 
                 ? "Calculating based on connected levels."
                 : band.isLeading ? "Leading anchor node." : "Manual configuration."}
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salary Sub-Bands</span>
            <span className="text-xs font-bold text-slate-700">
              ${Math.round(subBands[0].start).toLocaleString()} - ${Math.round(subBands[3].end).toLocaleString()}
            </span>
          </div>
          <div className="h-16 w-full flex rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
            {subBands.map((sub, idx) => (
              <div 
                key={sub.name}
                className={`h-full flex flex-col items-center justify-center border-r last:border-r-0 border-white/20 transition-all hover:brightness-105 relative ${
                  idx === 0 ? 'bg-blue-100' : 
                  idx === 1 ? 'bg-blue-200' : 
                  idx === 2 ? 'bg-blue-300' : 
                  'bg-blue-400'
                }`}
                style={{ width: '25%' }}
              >
                <span className="text-[10px] font-black uppercase text-blue-900/40 tracking-widest mb-1">{sub.name}</span>
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] font-bold text-blue-900">
                    ${Math.round(sub.start).toLocaleString()}
                  </span>
                  <div className="w-4 h-px bg-blue-900/20 my-0.5" />
                  <span className="text-[10px] font-bold text-blue-900">
                    ${Math.round(sub.end).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface BandNodeProps {
  bandId: string;
  activeFamily: JobFamily;
  onUpdateBand: (bandId: string, updates: Partial<SalaryBand>) => void;
  onToggleAutoCalc: (bandId: string) => void;
  onSetLeading: (bandId: string) => void;
  onAddBand: (parentId: string) => void;
  onRemoveBand: (bandId: string) => void;
}

const BandNode: React.FC<BandNodeProps> = ({ 
  bandId, 
  activeFamily, 
  onUpdateBand, 
  onToggleAutoCalc, 
  onSetLeading,
  onAddBand, 
  onRemoveBand 
}) => {
  const band = activeFamily.salaryBands.find(b => b.id === bandId);
  if (!band) return null;

  const children = activeFamily.salaryBands.filter(b => b.parentId === bandId);

  return (
    <div className="flex flex-col">
      <div className="flex">
        <div className="flex-1 max-w-3xl">
          <BandCard 
            band={band} 
            activeFamily={activeFamily}
            onUpdateBand={onUpdateBand}
            onToggleAutoCalc={onToggleAutoCalc}
            onSetLeading={onSetLeading}
            onAddBand={onAddBand}
            onRemoveBand={onRemoveBand}
          />
        </div>
      </div>
      {children.length > 0 && (
        <div className="ml-12 border-l-2 border-slate-200 pl-12 relative">
          <div className="absolute top-0 left-0 w-12 h-px bg-slate-200 -translate-x-full mt-8" />
          {children.map(child => (
            <BandNode 
              key={child.id} 
              bandId={child.id} 
              activeFamily={activeFamily}
              onUpdateBand={onUpdateBand}
              onToggleAutoCalc={onToggleAutoCalc}
              onSetLeading={onSetLeading}
              onAddBand={onAddBand}
              onRemoveBand={onRemoveBand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SalaryBandPlanner: React.FC<SalaryBandPlannerProps> = ({ jobFamilies, onDataChange }) => {
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(
    jobFamilies.length > 0 ? jobFamilies[0].id : null
  );
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false);

  const handleAddFamily = () => {
    const name = window.prompt('Enter job family name (e.g., Engineering, Design):');
    if (!name) return;

    const newFamily: JobFamily = {
      id: crypto.randomUUID(),
      name,
      salaryBands: [],
    };

    onDataChange([...jobFamilies, newFamily]);
    setActiveFamilyId(newFamily.id);
  };

  const handleRemoveFamily = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this job family?')) return;
    
    const nextFamilies = jobFamilies.filter(f => f.id !== id);
    onDataChange(nextFamilies);
    if (activeFamilyId === id) {
      setActiveFamilyId(nextFamilies.length > 0 ? nextFamilies[0].id : null);
    }
  };

  const activeFamily = jobFamilies.find(f => f.id === activeFamilyId);

  const performSync = (bands: SalaryBand[], leaderId: string): SalaryBand[] => {
    let nextBands = bands.map(b => ({ ...b }));
    const visited = new Set<string>();

    const syncFrom = (startId: string) => {
      const queue = [startId];
      visited.add(startId);

      while (queue.length > 0) {
        const currId = queue.shift()!;
        const current = nextBands.find(b => b.id === currId)!;

        // 1. Children (Downwards)
        const children = nextBands.filter(b => b.parentId === currId);
        children.forEach(child => {
          if (!visited.has(child.id) && child.isAutoCalculated) {
             const newMidpoint = calculateNextMidpoint(current.midpoint, current.spread);
             nextBands = nextBands.map(b => b.id === child.id ? { 
               ...b, 
               midpoint: newMidpoint, 
               spread: current.spread 
             } : b);
             visited.add(child.id);
             queue.push(child.id);
          }
        });

        // 2. Parent (Upwards)
        if (current.parentId) {
          const parent = nextBands.find(b => b.id === current.parentId);
          if (parent && !visited.has(parent.id) && parent.isAutoCalculated) {
             const prevMidpoint = calculatePreviousMidpoint(current.midpoint, current.spread);
             nextBands = nextBands.map(b => b.id === parent.id ? { 
               ...b, 
               midpoint: prevMidpoint, 
               spread: current.spread 
             } : b);
             visited.add(parent.id);
             queue.push(parent.id);
          }
        }
      }
    };

    // First sync from leader - it wins all conflicts for Auto nodes
    syncFrom(leaderId);

    // Then sync from all other manual nodes to cover their local Auto nodes
    nextBands.filter(b => !b.isAutoCalculated && !visited.has(b.id)).forEach(manual => {
      syncFrom(manual.id);
    });

    return nextBands;
  };

  const handleUpdateBand = (bandId: string, updates: Partial<SalaryBand>) => {
    if (!activeFamily) return;

    let bands = [...activeFamily.salaryBands];
    bands = bands.map(b => b.id === bandId ? { ...b, ...updates } : b);
    const updatedBand = bands.find(b => b.id === bandId)!;

    let syncLeaderId: string | undefined;
    
    if (!updatedBand.isAutoCalculated) {
      // Manual update -> This node is now the global source of truth for sync
      syncLeaderId = bandId;
      bands = bands.map(b => ({ ...b, isLeading: b.id === bandId }));
    } else {
      // Auto update -> Sync from the designated leader
      const leader = bands.find(b => b.isLeading && !b.isAutoCalculated);
      syncLeaderId = leader?.id || bands.find(b => !b.isAutoCalculated)?.id;
    }

    if (syncLeaderId) {
       bands = performSync(bands, syncLeaderId);
    }

    const nextFamilies = jobFamilies.map(f => {
      if (f.id === activeFamily.id) {
        return { ...f, salaryBands: bands };
      }
      return f;
    });

    onDataChange(nextFamilies);
  };

  const handleToggleAutoCalc = (bandId: string) => {
    if (!activeFamily) return;
    const band = activeFamily.salaryBands.find(b => b.id === bandId);
    if (!band) return;

    handleUpdateBand(bandId, { 
      isAutoCalculated: !band.isAutoCalculated,
      isLeading: false 
    });
  };

  const handleSetLeading = (bandId: string) => {
    if (!activeFamily) return;
    
    let bands = activeFamily.salaryBands.map(b => ({
      ...b,
      isLeading: b.id === bandId
    }));

    bands = performSync(bands, bandId);

    const nextFamilies = jobFamilies.map(f => {
      if (f.id === activeFamily.id) {
        return { ...f, salaryBands: bands };
      }
      return f;
    });

    onDataChange(nextFamilies);
  };

  const handleAddBand = (parentId?: string) => {
    if (!activeFamily) return;

    const name = window.prompt('Enter level name (e.g., Junior Engineer):');
    if (!name) return;

    let midpoint = 50000;
    let spread = 0.075;
    let isAuto = false;

    if (parentId) {
      const parent = activeFamily.salaryBands.find(b => b.id === parentId);
      if (parent) {
        midpoint = calculateNextMidpoint(parent.midpoint, parent.spread);
        spread = parent.spread;
        isAuto = true;
      }
    }

    const newBand: SalaryBand = {
      id: crypto.randomUUID(),
      name,
      midpoint,
      spread,
      isAutoCalculated: isAuto,
      parentId,
      isLeading: activeFamily.salaryBands.length === 0,
    };

    let bands = [...activeFamily.salaryBands, newBand];
    const leader = bands.find(b => b.isLeading) || bands[0];
    if (leader) {
      bands = performSync(bands, leader.id);
    }

    const nextFamilies = jobFamilies.map(f => {
      if (f.id === activeFamily.id) {
        return { ...f, salaryBands: bands };
      }
      return f;
    });

    onDataChange(nextFamilies);
  };

  const handleRemoveBand = (bandId: string) => {
    if (!activeFamily || !window.confirm('Delete this level and its children?')) return;

    const getChildrenIds = (id: string): string[] => {
      const children = activeFamily.salaryBands.filter(b => b.parentId === id);
      return [id, ...children.flatMap(c => getChildrenIds(c.id))];
    };

    const idsToRemove = getChildrenIds(bandId);
    let bands = activeFamily.salaryBands.filter(b => !idsToRemove.includes(b.id));

    if (!bands.some(b => b.isLeading) && bands.length > 0) {
       const newLeader = bands.find(b => !b.isAutoCalculated) || bands[0];
       bands = bands.map(b => ({ ...b, isLeading: b.id === newLeader.id }));
    }

    const nextFamilies = jobFamilies.map(f => {
      if (f.id === activeFamily.id) {
        return { ...f, salaryBands: bands };
      }
      return f;
    });

    onDataChange(nextFamilies);
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Job Families
          </h2>
          <button 
            onClick={handleAddFamily}
            className="p-1 hover:bg-slate-100 rounded text-blue-600 transition-colors"
            title="Add Job Family"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {jobFamilies.map(family => (
            <div 
              key={family.id}
              onClick={() => setActiveFamilyId(family.id)}
              className={`group px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                activeFamilyId === family.id ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{family.name}</span>
              <button 
                onClick={(e) => handleRemoveFamily(family.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {jobFamilies.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-400 text-sm italic">
              No job families defined yet.
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeFamily ? (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{activeFamily.name}</h1>
                <p className="text-slate-500 text-sm">Define career levels and salary bands.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleAddBand()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Root Level
                </button>
              </div>
            </div>

            {/* Overview Section */}
            {activeFamily.salaryBands.length > 0 && (
              <div className="mb-12">
                <button 
                  onClick={() => setIsOverviewCollapsed(!isOverviewCollapsed)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 hover:text-slate-600 transition-colors"
                >
                  {isOverviewCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Salary Progression Overview
                  <Layers className="h-3.5 w-3.5 ml-1" />
                </button>
                
                {!isOverviewCollapsed && (
                  <JobFamilyOverview activeFamily={activeFamily} />
                )}
              </div>
            )}

            <div className="space-y-6">
              {activeFamily.salaryBands
                .filter(b => !b.parentId)
                .map(rootBand => (
                  <BandNode 
                    key={rootBand.id} 
                    bandId={rootBand.id} 
                    activeFamily={activeFamily} 
                    onUpdateBand={handleUpdateBand}
                    onToggleAutoCalc={handleToggleAutoCalc}
                    onSetLeading={handleSetLeading}
                    onAddBand={handleAddBand}
                    onRemoveBand={handleRemoveBand}
                  />
                ))}

              {activeFamily.salaryBands.length === 0 && (
                <div 
                  onClick={() => handleAddBand()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <Plus className="h-8 w-8 text-slate-300 group-hover:text-blue-400 mx-auto mb-3" />
                  <span className="text-slate-400 group-hover:text-blue-500 font-medium">Add your first level to this job family</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Salary Band Planning</h3>
              <p className="text-slate-500 mb-8">Select a job family from the sidebar or create a new one to start modeling career paths and compensation.</p>
              <button 
                onClick={handleAddFamily}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-blue-200"
              >
                Create Job Family
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
