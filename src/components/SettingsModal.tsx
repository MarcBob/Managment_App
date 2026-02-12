import { X, Settings as SettingsIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leafColumns: number;
  setLeafColumns: (value: number) => void;
}

export const SettingsModal = ({ isOpen, onClose, leafColumns, setLeafColumns }: SettingsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-slate-600" />
            <h3 className="font-bold text-slate-800">Chart Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
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

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
