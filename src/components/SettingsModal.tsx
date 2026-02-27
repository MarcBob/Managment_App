import { useState } from 'react';
import { X, Settings as SettingsIcon, Plus, Trash2, Palette, GripVertical, Layers, Save, Edit2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LeadershipLayer } from '../utils/leadershipLayers';
import type { NodeFilter, FilterGroup } from '../utils/nodeFilters';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leafColumns: number;
  setLeafColumns: (value: number) => void;
  leadershipLayers: LeadershipLayer[];
  setLeadershipLayers: (layers: LeadershipLayer[]) => void;
  nodeFilters: NodeFilter[];
  setNodeFilters: (filters: NodeFilter[]) => void;
  filterGroups: FilterGroup[];
  setFilterGroups: (groups: FilterGroup[]) => void;
  defaultFallbackColor?: string;
  setDefaultFallbackColor: (color: string) => void;
  searchShortcut: string;
  setSearchShortcut: (shortcut: string) => void;
  teamsShortcut: string;
  setTeamsShortcut: (shortcut: string) => void;
  companyDomain: string;
  setCompanyDomain: (domain: string) => void;
  outlookBaseUrl: string;
  setOutlookBaseUrl: (url: string) => void;
}

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  leafColumns, 
  setLeafColumns,
  leadershipLayers,
  setLeadershipLayers,
  nodeFilters,
  setNodeFilters,
  filterGroups,
  setFilterGroups,
  defaultFallbackColor = '#ffffff',
  setDefaultFallbackColor,
  searchShortcut,
  setSearchShortcut,
  teamsShortcut,
  setTeamsShortcut,
  companyDomain,
  setCompanyDomain,
  outlookBaseUrl,
  setOutlookBaseUrl
}: SettingsModalProps) => {
  if (!isOpen) return null;

  const addLayer = () => {
    const newLayer: LeadershipLayer = {
      id: Date.now().toString(),
      name: `Layer ${leadershipLayers.length + 1}`,
      identifier: ''
    };
    setLeadershipLayers([...leadershipLayers, newLayer]);
  };

  const removeLayer = (id: string) => {
    setLeadershipLayers(leadershipLayers.filter(l => l.id !== id));
  };

  const updateLayer = (id: string, identifier: string) => {
    setLeadershipLayers(leadershipLayers.map(l => l.id === id ? { ...l, identifier } : l));
  };

  const addFilter = () => {
    const newFilter: NodeFilter = {
      id: Date.now().toString(),
      name: `Filter ${nodeFilters.length + 1}`,
      pattern: '',
      color: '#e2e8f0'
    };
    setNodeFilters([...nodeFilters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setNodeFilters(nodeFilters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<NodeFilter>) => {
    setNodeFilters(nodeFilters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const saveAsGroup = () => {
    if (nodeFilters.length === 0) return;
    
    const groupName = prompt('Enter a name for this filter group:', `Group ${filterGroups.length + 1}`);
    if (!groupName) return;

    const newGroup: FilterGroup = {
      id: Date.now().toString(),
      name: groupName,
      enabled: true,
      filters: [...nodeFilters],
      defaultFallbackColor: defaultFallbackColor
    };

    setFilterGroups([...filterGroups, newGroup]);
    setNodeFilters([]); // Clear scratchpad after saving
    setDefaultFallbackColor('#ffffff'); // Reset scratchpad fallback
  };

  const removeFilterGroup = (id: string) => {
    setFilterGroups(filterGroups.filter(g => g.id !== id));
  };

  const toggleFilterGroup = (id: string) => {
    setFilterGroups(filterGroups.map(g => 
      g.id === id ? { ...g, enabled: !g.enabled } : g
    ));
  };

  const updateFilterGroupName = (id: string, name: string) => {
    setFilterGroups(filterGroups.map(g => 
      g.id === id ? { ...g, name } : g
    ));
  };

  const updateFilterGroupFallback = (id: string, color: string) => {
    setFilterGroups(filterGroups.map(g => 
      g.id === id ? { ...g, defaultFallbackColor: color } : g
    ));
  };

  const editFilterGroup = (groupId: string) => {
    const groupToEdit = filterGroups.find(g => g.id === groupId);
    if (!groupToEdit) return;

    let nextGroups = filterGroups.filter(g => g.id !== groupId);

    // If there are current scratchpad filters, save them to "Temp Save"
    if (nodeFilters.length > 0) {
      const tempGroup: FilterGroup = {
        id: `temp-${Date.now()}`,
        name: 'Temp Save',
        enabled: true,
        filters: [...nodeFilters],
        defaultFallbackColor: defaultFallbackColor
      };
      nextGroups = [...nextGroups, tempGroup];
    }

    setFilterGroups(nextGroups);
    setNodeFilters(groupToEdit.filters);
    if (groupToEdit.defaultFallbackColor) {
      setDefaultFallbackColor(groupToEdit.defaultFallbackColor);
    }
  };

  const [draggedFilterIndex, setDraggedFilterIndex] = useState<number | null>(null);
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedFilterIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedFilterIndex === null || draggedFilterIndex === index) return;

    const newFilters = [...nodeFilters];
    const draggedItem = newFilters[draggedFilterIndex];
    newFilters.splice(draggedFilterIndex, 1);
    newFilters.splice(index, 0, draggedItem);
    setNodeFilters(newFilters);
    setDraggedFilterIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedFilterIndex(null);
  };

  const handleGroupDragStart = (index: number) => {
    setDraggedGroupIndex(index);
  };

  const handleGroupDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedGroupIndex === null || draggedGroupIndex === index) return;

    const newGroups = [...filterGroups];
    const draggedItem = newGroups[draggedGroupIndex];
    newGroups.splice(draggedGroupIndex, 1);
    newGroups.splice(index, 0, draggedItem);
    setFilterGroups(newGroups);
    setDraggedGroupIndex(index);
  };

  const handleGroupDragEnd = () => {
    setDraggedGroupIndex(null);
  };

  const handleLayerDragStart = (index: number) => {
    setDraggedLayerIndex(index);
  };

  const handleLayerDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedLayerIndex === null || draggedLayerIndex === index) return;

    const newLayers = [...leadershipLayers];
    const draggedItem = newLayers[draggedLayerIndex];
    newLayers.splice(draggedLayerIndex, 1);
    newLayers.splice(index, 0, draggedItem);
    setLeadershipLayers(newLayers);
    setDraggedLayerIndex(index);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] relative z-10">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-slate-600" />
            <h3 className="font-bold text-slate-800">Chart Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Leaf Columns */}
          <div className="space-y-3">
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700">Leaf Node Columns</label>
              <p className="text-xs text-slate-500 mt-1">
                Arrange positions with no subordinates into multiple columns to save horizontal space.
              </p>
            </div>
            
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              {[1, 2, 3, 4].map((cols) => (
                <button
                  key={cols}
                  onClick={() => setLeafColumns(cols)}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    leafColumns === cols
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cols} {cols === 1 ? 'Col' : 'Cols'}
                </button>
              ))}
            </div>
          </div>

          {/* Node Filters */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Palette size={16} />
                Custom Color Filters
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Highlight nodes based on job titles. The first matching filter in the list takes priority. Drag to reorder.
              </p>
            </div>

            <div className="space-y-2">
              {nodeFilters.map((filter, index) => (
                <div 
                  key={filter.id} 
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 group relative transition-all",
                    draggedFilterIndex === index ? "opacity-40 scale-95 border-blue-400 border-dashed" : "opacity-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                      <GripVertical size={18} />
                    </div>
                    
                    <input
                      type="text"
                      value={filter.pattern}
                      onChange={(e) => updateFilter(filter.id, { pattern: e.target.value })}
                      placeholder="Keywords (e.g. Senior, Manager)"
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    
                    <div className="relative group/color">
                      <input
                        type="color"
                        value={filter.color}
                        onChange={(e) => updateFilter(filter.id, { color: e.target.value })}
                        className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                      />
                    </div>

                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 p-3 bg-blue-50/30 rounded-lg border border-blue-100/50">
                <div className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Default Fallback Color
                </div>
                <input
                  type="color"
                  value={defaultFallbackColor}
                  onChange={(e) => setDefaultFallbackColor(e.target.value)}
                  className="w-8 h-8 rounded-md cursor-pointer border-none bg-transparent"
                  title="Color for nodes that don't match any filter"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={addFilter}
                  className="flex-1 py-2 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 border-dashed"
                >
                  <Plus size={16} />
                  Add Color Filter
                </button>
                {nodeFilters.length > 0 && (
                  <button
                    onClick={saveAsGroup}
                    className="px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-100 border-dashed"
                    title="Save current filters as a group"
                  >
                    <Save size={16} />
                    Save as Group
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Groups */}
          {filterGroups.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Layers size={16} />
                  Saved Filter Groups
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Toggle entire sets of filters on or off.
                </p>
              </div>

              <div className="space-y-2">
                {filterGroups.map((group, index) => (
                  <div 
                    key={group.id} 
                    draggable
                    onDragStart={() => handleGroupDragStart(index)}
                    onDragOver={(e) => handleGroupDragOver(e, index)}
                    onDragEnd={handleGroupDragEnd}
                    className={cn(
                      "flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 transition-all",
                      !group.enabled && "opacity-60 bg-slate-100",
                      draggedGroupIndex === index ? "opacity-40 scale-95 border-blue-400 border-dashed" : "opacity-100"
                    )}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                      <GripVertical size={18} />
                    </div>

                    <button 
                      onClick={() => toggleFilterGroup(group.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        group.enabled ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        group.enabled ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>

                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => updateFilterGroupName(group.id, e.target.value)}
                      className="flex-1 px-2 py-1 text-sm font-medium border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white bg-transparent rounded-md focus:outline-none transition-all"
                    />

                    <div className="flex -space-x-1.5 overflow-hidden">
                      {group.filters.slice(0, 3).map((f) => (
                        <div 
                          key={f.id} 
                          className="w-4 h-4 rounded-full border border-white"
                          style={{ backgroundColor: f.color }}
                        />
                      ))}
                      {group.filters.length > 3 && (
                        <div className="text-[10px] font-bold text-slate-400 pl-1">
                          +{group.filters.length - 3}
                        </div>
                      )}
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1" />

                    <input
                      type="color"
                      value={group.defaultFallbackColor || '#ffffff'}
                      onChange={(e) => updateFilterGroupFallback(group.id, e.target.value)}
                      className="w-6 h-6 rounded-md cursor-pointer border-none bg-transparent"
                      title="Fallback color for this group"
                    />

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => editFilterGroup(group.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        title="Edit group filters"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => removeFilterGroup(group.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leadership Layers */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700">Leadership Layers</label>
              <p className="text-xs text-slate-500 mt-1">
                Define layers that should be drawn at the same height. Nodes matching any of the identifiers (job title keywords) will be aligned.
              </p>
            </div>

            <div className="space-y-2">
              {leadershipLayers.map((layer, index) => (
                <div 
                  key={layer.id} 
                  draggable
                  onDragStart={() => handleLayerDragStart(index)}
                  onDragOver={(e) => handleLayerDragOver(e, index)}
                  onDragEnd={handleLayerDragEnd}
                  className={cn(
                    "flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 group transition-all",
                    draggedLayerIndex === index ? "opacity-40 scale-95 border-blue-400 border-dashed" : "opacity-100"
                  )}
                >
                  <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                    <GripVertical size={18} />
                  </div>
                  <div className="text-xs font-bold text-slate-400 w-6">
                    L{index + 1}
                  </div>
                  <input
                    type="text"
                    value={layer.identifier}
                    onChange={(e) => updateLayer(layer.id, e.target.value)}
                    placeholder="e.g. Manager, Principal"
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    onClick={() => removeLayer(layer.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <button
                onClick={addLayer}
                className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 border-dashed"
              >
                <Plus size={16} />
                Add Leadership Layer
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700">Keyboard Shortcuts</label>
              <p className="text-xs text-slate-500 mt-1">
                Configure shortcuts for quick actions. Use 'meta' for Command (Mac) or Windows key.
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm text-slate-600 flex-1">Focus Search</span>
              <input
                type="text"
                value={searchShortcut}
                onChange={(e) => setSearchShortcut(e.target.value.toLowerCase())}
                placeholder="e.g. meta+e"
                className="w-32 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm text-slate-600 flex-1">Open Teams Chat</span>
              <input
                type="text"
                value={teamsShortcut}
                onChange={(e) => setTeamsShortcut(e.target.value.toLowerCase())}
                placeholder="e.g. meta+m"
                className="w-32 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
              />
            </div>
          </div>

          {/* Company & Outlook Settings */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700">Company & Outlook Settings</label>
              <p className="text-xs text-slate-500 mt-1">
                Configure the company domain and Outlook Web access.
              </p>
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Email Domain</label>
                <input
                  type="text"
                  value={companyDomain}
                  onChange={(e) => setCompanyDomain(e.target.value)}
                  placeholder="e.g. dkb.de"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outlook Compose URL</label>
                <input
                  type="text"
                  value={outlookBaseUrl}
                  onChange={(e) => setOutlookBaseUrl(e.target.value)}
                  placeholder="https://outlook.office.com/mail/deeplink/compose"
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[10px] text-slate-400">
                  Used for "Send Email" deep links.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 border-t border-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
