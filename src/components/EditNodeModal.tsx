import { useState, useEffect, useRef } from 'react';
import { X, Trash2, AlertCircle, MessageSquare, ChevronDown, Users } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EditNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  nodeId: string;
  nodeData: any;
  existingTeams: string[];
  existingJobTitles: string[];
  possibleManagers: { id: string, name: string }[];
  currentManagerId: string;
  companyDomain: string;
  outlookBaseUrl: string;
  allNodes: any[];
  allEdges: any[];
}

export const EditNodeModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  nodeId, 
  nodeData, 
  existingTeams,
  existingJobTitles,
  possibleManagers,
  currentManagerId,
  companyDomain,
  outlookBaseUrl,
  allNodes,
  allEdges
}: EditNodeModalProps) => {
  const [formData, setFormData] = useState({ ...nodeData, managerId: currentManagerId });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormData({ ...nodeData, managerId: currentManagerId });
    setShowConfirmDelete(false);
    setShowActionMenu(false);
  }, [nodeData, currentManagerId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
      
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const generateEmail = (firstName: string, lastName: string) => {
    if (!firstName && !lastName) return '';
    const cleanFirst = firstName.trim().replace(/\s+/g, '.').toLowerCase();
    const cleanLast = lastName.trim().replace(/\s+/g, '.').toLowerCase();
    const domain = companyDomain || 'dkb.de';
    
    if (cleanFirst && cleanLast) return `${cleanFirst}.${cleanLast}@${domain}`;
    if (cleanFirst) return `${cleanFirst}@${domain}`;
    if (cleanLast) return `${cleanLast}@${domain}`;
    return '';
  };

  const handleNameChange = (updates: Partial<typeof formData>) => {
    const nextData = { ...formData, ...updates };
    // Only auto-generate if email is currently empty or was previously auto-generated
    const currentAutoEmail = generateEmail(formData.firstName || '', formData.lastName || '');
    if (!formData.workEmail || formData.workEmail === currentAutoEmail) {
      nextData.workEmail = generateEmail(nextData.firstName || '', nextData.lastName || '');
    }
    setFormData(nextData);
  };

  const getDirectReportsEmails = () => {
    const childrenIds = allEdges.filter(e => e.source === nodeId).map(e => e.target);
    return allNodes
      .filter(n => childrenIds.includes(n.id) && n.data.workEmail)
      .map(n => n.data.workEmail);
  };

  const getFullOrgEmails = () => {
    const emails = new Set<string>();
    const stack = [nodeId];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = allNodes.find(n => n.id === current);
      if (node?.data.workEmail) emails.add(node.data.workEmail);

      const children = allEdges.filter(e => e.source === current).map(e => e.target);
      stack.push(...children);
    }
    return Array.from(emails);
  };

  const handleSendEmail = (type: 'person' | 'direct' | 'full') => {
    let recipients: string[] = [];
    if (type === 'person') recipients = [formData.workEmail];
    else if (type === 'direct') recipients = [formData.workEmail, ...getDirectReportsEmails()];
    else if (type === 'full') recipients = getFullOrgEmails();

    const validRecipients = recipients.filter(Boolean);
    if (validRecipients.length === 0) return;

    const outlookUrl = outlookBaseUrl || 'https://outlook.office.com/mail/deeplink/compose';
    window.open(`${outlookUrl}?to=${validRecipients.join(';')}`, '_blank', 'noopener,noreferrer');
    setShowActionMenu(false);
  };

  const handleSendMessage = (type: 'person' | 'direct' | 'full') => {
    let recipients: string[] = [];
    if (type === 'person') recipients = [formData.workEmail];
    else if (type === 'direct') recipients = [formData.workEmail, ...getDirectReportsEmails()];
    else if (type === 'full') recipients = getFullOrgEmails();

    const validRecipients = recipients.filter(Boolean);
    if (validRecipients.length === 0) return;

    // MS Teams deep link: https://teams.microsoft.com/l/chat/0/0?users=recipient1,recipient2,...
    const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${validRecipients.join(',')}`;
    window.open(teamsUrl, '_blank', 'noopener,noreferrer');
    setShowActionMenu(false);
  };

  const directReportsEmails = getDirectReportsEmails();
  const fullOrgEmails = getFullOrgEmails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800">
            {showConfirmDelete ? 'Confirm Deletion' : 'Edit Position'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {showConfirmDelete ? (
          <div className="p-6 space-y-4 overflow-y-auto">
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
          <form className="p-6 space-y-4 overflow-y-auto" onSubmit={(e) => {
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
                  onChange={(e) => handleNameChange({ firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.lastName || ''}
                  onChange={(e) => handleNameChange({ lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.workEmail || ''}
                  onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                  placeholder={`first.last@${companyDomain || 'dkb.de'}`}
                />
                
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('person')}
                    disabled={!formData.workEmail}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center border border-indigo-100 shadow-sm"
                    title="Open MS Teams Chat"
                  >
                    <MessageSquare size={18} />
                  </button>

                  <div className="relative" ref={actionMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowActionMenu(!showActionMenu)}
                      className="px-2 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center border border-slate-100 shadow-sm"
                      title="More Options"
                    >
                      <ChevronDown size={18} className={cn(showActionMenu && "rotate-180 transition-transform")} />
                    </button>

                    {showActionMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-2 overflow-hidden">
                        {/* Teams Section */}
                        <div className="px-4 py-2 border-b border-slate-100 mb-1 bg-slate-50/50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teams Options</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleSendMessage('person')}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 flex flex-col"
                        >
                          <span className="font-semibold text-slate-700">Chat with {formData.firstName || 'Employee'}</span>
                          <span className="text-[10px] text-slate-400 truncate">{formData.workEmail}</span>
                        </button>

                        {directReportsEmails.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSendMessage('direct')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 flex flex-col border-t border-slate-50"
                          >
                            <span className="font-semibold text-slate-700 flex items-center gap-2">
                              <Users size={14} />
                              Person + Direct Reports
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {directReportsEmails.length + 1} participants
                            </span>
                          </button>
                        )}

                        {fullOrgEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleSendMessage('full')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 flex flex-col border-t border-slate-50"
                          >
                            <span className="font-semibold text-slate-700 flex items-center gap-2">
                              <Users size={14} />
                              Full Sub-Organization
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {fullOrgEmails.length} total participants
                            </span>
                          </button>
                        )}

                        {/* Email Section */}
                        <div className="px-4 py-2 border-y border-slate-100 my-1 bg-slate-50/50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Options</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendEmail('person')}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex flex-col"
                        >
                          <span className="font-semibold text-slate-700">Email {formData.firstName || 'Employee'}</span>
                          <span className="text-[10px] text-slate-400 truncate">{formData.workEmail}</span>
                        </button>

                        {directReportsEmails.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSendEmail('direct')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex flex-col border-t border-slate-50"
                          >
                            <span className="font-semibold text-slate-700 flex items-center gap-2">
                              <Users size={14} />
                              Person + Direct Reports
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {directReportsEmails.length + 1} recipients
                            </span>
                          </button>
                        )}

                        {fullOrgEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleSendEmail('full')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex flex-col border-t border-slate-50"
                          >
                            <span className="font-semibold text-slate-700 flex items-center gap-2">
                              <Users size={14} />
                              Full Sub-Organization
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {fullOrgEmails.length} total recipients
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
              <input
                type="text"
                required
                list="existing-job-titles"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.jobTitle || ''}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
              <datalist id="existing-job-titles">
                {existingJobTitles.map(title => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direct Manager</label>
              <input
                type="text"
                list="possible-managers"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={possibleManagers.find(m => m.id === formData.managerId)?.name || formData.managerId || ''}
                onChange={(e) => {
                  const selectedManager = possibleManagers.find(m => m.name === e.target.value);
                  setFormData({ ...formData, managerId: selectedManager ? selectedManager.id : e.target.value });
                }}
                placeholder="Select or type manager ID..."
              />
              <datalist id="possible-managers">
                {possibleManagers.map(m => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exit Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.exitDate || ''}
                  onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Probation Period Ends</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.probationEndDate || ''}
                onChange={(e) => setFormData({ ...formData, probationEndDate: e.target.value })}
              />
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
