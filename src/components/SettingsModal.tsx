import { useState } from 'react';
import { X, Settings as SettingsIcon, Plus, Trash2, ArrowUp, ArrowDown, Palette, GripVertical } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LeadershipLayer } from '../utils/leadershipLayers';
import type { NodeFilter } from '../utils/nodeFilters';

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
}

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  leafColumns, 
  setLeafColumns,
  leadershipLayers,
  setLeadershipLayers,
  nodeFilters,
  setNodeFilters
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

  const moveFilter = (index: number, direction: 'up' | 'down') => {
    const newFilters = [...nodeFilters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFilters.length) {
      [newFilters[index], newFilters[targetIndex]] = [newFilters[targetIndex], newFilters[index]];
      setNodeFilters(newFilters);
    }
  };

  const [draggedFilterIndex, setDraggedFilterIndex] = useState<number | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
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
              
              <button
                onClick={addFilter}
                className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-100 border-dashed"
              >
                <Plus size={16} />
                Add Color Filter
              </button>
            </div>
          </div>

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
                <div key={layer.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 group">
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
