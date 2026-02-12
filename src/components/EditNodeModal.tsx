import { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';

interface EditNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  nodeId: string;
  nodeData: any;
  existingTeams: string[];
}

export const EditNodeModal = ({ isOpen, onClose, onSave, onDelete, nodeId, nodeData, existingTeams }: EditNodeModalProps) => {
  const [formData, setFormData] = useState(nodeData);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    setFormData(nodeData);
    setShowConfirmDelete(false);
  }, [nodeData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800">
            {showConfirmDelete ? 'Confirm Deletion' : 'Edit Position'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {showConfirmDelete ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-medium">
                Are you sure you want to delete this position? This action cannot be undone and will remove all reporting lines to this position.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
              >
                No, Keep it
              </button>
              <button
                type="button"
                onClick={() => onDelete(nodeId)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        ) : (
          <form className="p-6 space-y-4" onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.jobTitle || ''}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team</label>
              <input
                type="text"
                list="existing-teams"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.team || ''}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              />
              <datalist id="existing-teams">
                {existingTeams.map(team => (
                  <option key={team} value={team} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'FILLED' | 'EMPTY' })}
              >
                <option value="FILLED">Filled</option>
                <option value="EMPTY">Empty</option>
              </select>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="w-full px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center gap-2 border border-transparent hover:border-rose-100"
              >
                <Trash2 size={16} />
                Delete Position
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
