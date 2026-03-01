import { useState, useEffect, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { OrgChart } from './components/OrgChart';
import { EditableTitle } from './components/EditableTitle';
import { StatsModal } from './components/StatsModal';
import { SalaryBandPlanner } from './components/SalaryBandPlanner';
import { parseOrgCsv, exportRecruiterViewToCsv, importRecruiterViewFromCsv, updatePlanWithCsv } from './utils/csvParser';
import type { OrgNode, OrgEdge } from './utils/csvParser';
import type { LeadershipLayer } from './utils/leadershipLayers';
import type { NodeFilter, FilterGroup } from './utils/nodeFilters';
import type { JobFamily } from './utils/salaryBands';
import { CloudOff, RefreshCw, CheckCircle2, FolderOpen, Plus, FileUp, Trash2, Download, Upload, LayoutPanelLeft, BarChart3 } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:3001/api';
const LOCAL_STORAGE_KEY = 'org-planner-state';
const CURRENT_PLAN_KEY = 'org-planner-current-plan';

type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';
type AppView = 'chart' | 'salary';

interface ViewState {
  maxDepth?: number;
  leafColumns?: number;
  collapsedNodes?: string[];
  expandedNodes?: string[];
  leadershipLayers?: LeadershipLayer[];
  nodeFilters?: NodeFilter[];
  filterGroups?: FilterGroup[];
  defaultFallbackColor?: string;
  connectionColor?: string;
  backgroundColor?: string;
  searchShortcut?: string;
  teamsShortcut?: string;
  companyDomain?: string;
  outlookBaseUrl?: string;
}

interface PlanData {
  name: string;
  nodes: OrgNode[];
  edges: OrgEdge[];
  lastUpdated?: string;
  viewState?: ViewState;
  jobFamilies?: JobFamily[];
}

// Interface for old schema during migration
interface LegacyPlanData extends PlanData {
  maxDepth?: number;
  leafColumns?: number;
  collapsedNodes?: string[];
  expandedNodes?: string[];
  leadershipLayers?: LeadershipLayer[];
  nodeFilters?: NodeFilter[];
  filterGroups?: FilterGroup[];
  defaultFallbackColor?: string;
  connectionColor?: string;
  backgroundColor?: string;
  searchShortcut?: string;
  teamsShortcut?: string;
  companyDomain?: string;
  outlookBaseUrl?: string;
}

function App() {
  const [data, setData] = useState<PlanData | null>(null);
  const [currentPlanName, setCurrentPlanName] = useState<string>(() => {
    return localStorage.getItem(CURRENT_PLAN_KEY) || 'default';
  });
  const [availablePlans, setAvailablePlans] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [serverReachable, setServerReachable] = useState(true);
  const [isRecruiterMode, setIsRecruiterMode] = useState(false);
  const [forceFitView, setForceFitView] = useState(false);
  const [isPlanMenuOpen, setIsPlanMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('chart');
  const planMenuRef = useRef<HTMLDivElement>(null);
  const planMenuButtonRef = useRef<HTMLButtonElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const recruiterImportInputRef = useRef<HTMLInputElement>(null);
  const updateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isPlanMenuOpen && 
        planMenuRef.current && 
        !planMenuRef.current.contains(event.target as Node) &&
        planMenuButtonRef.current &&
        !planMenuButtonRef.current.contains(event.target as Node)
      ) {
        setIsPlanMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isPlanMenuOpen]);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  useEffect(() => {
    if (forceFitView) {
      const timer = setTimeout(() => setForceFitView(false), 500);
      return () => clearTimeout(timer);
    }
  }, [forceFitView]);

  const syncToServer = useCallback(async (state: PlanData) => {
    try {
      const response = await fetch(`${API_URL}/save/${encodeURIComponent(state.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (response.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.warn('[FRONTEND] Sync to server failed', e);
      setSaveStatus('offline');
    }
  }, []);

  // Load available plans
  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/plans`);
      if (response.ok) {
        const plans = await response.json();
        setAvailablePlans(plans);
      }
    } catch (error) {
      console.warn('[FRONTEND] Failed to fetch plans', error);
    }
  }, []);

  // Load saved state on startup or when plan changes
  useEffect(() => {
    const loadState = async () => {
      setIsLoading(true);
      let finalData: PlanData | null = null;
      let serverData: LegacyPlanData | null = null;

      // 1. Try loading from server
      try {
        console.log(`[FRONTEND] Loading plan [${currentPlanName}] from server...`);
        const response = await fetch(`${API_URL}/load/${currentPlanName}`);
        if (response.ok) {
          serverData = await response.json();
          // Migration for old flat schema
          if (serverData && !serverData.viewState && (serverData.maxDepth || serverData.leafColumns || serverData.leadershipLayers || serverData.nodeFilters || serverData.filterGroups || serverData.searchShortcut || serverData.teamsShortcut || serverData.companyDomain || serverData.outlookBaseUrl || serverData.defaultFallbackColor || serverData.connectionColor || serverData.backgroundColor)) {
            serverData.viewState = {
              maxDepth: serverData.maxDepth,
              leafColumns: serverData.leafColumns,
              collapsedNodes: serverData.collapsedNodes,
              expandedNodes: serverData.expandedNodes,
              leadershipLayers: serverData.leadershipLayers,
              nodeFilters: serverData.nodeFilters,
              filterGroups: serverData.filterGroups,
              defaultFallbackColor: serverData.defaultFallbackColor,
              connectionColor: serverData.connectionColor,
              backgroundColor: serverData.backgroundColor,
              searchShortcut: serverData.searchShortcut,
              teamsShortcut: serverData.teamsShortcut,
              companyDomain: serverData.companyDomain,
              outlookBaseUrl: serverData.outlookBaseUrl
            };
          }
          if (serverData) {
            serverData.name = serverData.name || currentPlanName;
          }
          finalData = serverData;
          setServerReachable(true);
        }
      } catch (error) {
        console.warn('[FRONTEND] Could not connect to persistence server.', error);
        setServerReachable(false);
        setSaveStatus('offline');
      }

      // 2. Check LocalStorage for a newer version
      try {
        const localRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${currentPlanName}`);
        if (localRaw) {
          const localData: PlanData = JSON.parse(localRaw);
          const serverTime = serverData?.lastUpdated ? new Date(serverData.lastUpdated).getTime() : 0;
          const localTime = localData?.lastUpdated ? new Date(localData.lastUpdated).getTime() : 0;

          if (localTime > serverTime) {
            console.log('[FRONTEND] LocalStorage version is newer, using it.');
            finalData = localData;
            if (serverReachable && localData.nodes) {
              syncToServer(localData);
            }
          }
        }
      } catch (e) {
        console.error('[FRONTEND] Error checking localStorage:', e);
      }

      setData(finalData);
      setIsLoading(false);
      fetchPlans();
    };

    loadState();
  }, [currentPlanName, serverReachable, fetchPlans, syncToServer]);

  const handleDataLoaded = (nodes: OrgNode[], edges: OrgEdge[]) => {
    const newName = currentPlanName === 'default' && data === null ? 'Untitled Plan' : currentPlanName;
    const newData: PlanData = { 
      name: newName, 
      nodes, 
      edges, 
      lastUpdated: new Date().toISOString() 
    };
    setForceFitView(true);
    setData(newData);
    setCurrentPlanName(newName);
    localStorage.setItem(CURRENT_PLAN_KEY, newName);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${newName}`, JSON.stringify(newData));
    if (serverReachable) syncToServer(newData);
    fetchPlans(); // Refresh plan list after first save
  };

  const handleDataChange = useCallback(async (newState: Partial<PlanData>) => {
    if (!data) return;

    const timestampedState: PlanData = {
      ...data,
      ...newState,
      lastUpdated: new Date().toISOString()
    };

    setData(timestampedState);
    
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${timestampedState.name}`, JSON.stringify(timestampedState));
    } catch (e) {
      console.warn('[FRONTEND] LocalStorage save failed', e);
    }

    if (!serverReachable) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`${API_URL}/save/${timestampedState.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timestampedState),
      });
      if (response.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.warn('[FRONTEND] Save to server failed', error);
      setSaveStatus('offline');
      setServerReachable(false);
    }
  }, [data, serverReachable, syncToServer]);

  const handleUpdatePlan = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !data) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target?.result as string;
      try {
        const { nodes, edges } = updatePlanWithCsv(data.nodes, data.edges, csvContent);
        setForceFitView(true);
        handleDataChange({ nodes, edges });
        setIsPlanMenuOpen(false);
      } catch (error) {
        console.error('Failed to update plan:', error);
        alert('Failed to update plan. Please check the CSV format.');
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be uploaded again
    if (event.target) event.target.value = '';
  }, [data, handleDataChange]);

  const handleRename = async (newName: string) => {
    const oldName = data?.name || currentPlanName;
    if (oldName === newName) return;

    // 1. If we have data and server is reachable, rename on server
    if (data && serverReachable) {
      setSaveStatus('saving');
      try {
        const response = await fetch(`${API_URL}/rename`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName, newName }),
        });
        
        if (!response.ok) {
          const err = await response.json();
          // If the error is 404 (file doesn't exist yet), we'll just handle it as a new save
          if (response.status !== 404) {
            alert(`Failed to rename: ${err.error || 'Unknown error'}`);
            setSaveStatus('error');
            return;
          }
        }
      } catch (error) {
        console.error('[FRONTEND] Rename failed', error);
        setSaveStatus('offline');
        setServerReachable(false);
      }
    }
    
    // 2. Update Local Storage
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${oldName}`);
    
    if (data) {
      const newData = { ...data, name: newName };
      setData(newData);
      setCurrentPlanName(newName);
      localStorage.setItem(CURRENT_PLAN_KEY, newName);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${newName}`, JSON.stringify(newData));
      
      if (serverReachable) {
        await syncToServer(newData);
        setSaveStatus('saved');
        fetchPlans();
      }
    } else {
      // Just updating the name for an empty plan
      setCurrentPlanName(newName);
      localStorage.setItem(CURRENT_PLAN_KEY, newName);
    }
  };

  const handleSwitchPlan = (name: string) => {
    setCurrentPlanName(name);
    localStorage.setItem(CURRENT_PLAN_KEY, name);
    setIsPlanMenuOpen(false);
  };

  const handleDeletePlan = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the plan "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (serverReachable) {
        const response = await fetch(`${API_URL}/plans/${encodeURIComponent(name)}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json();
          alert(`Failed to delete plan: ${err.error || 'Unknown error'}`);
          return;
        }
      }

      // Cleanup local storage
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${name}`);

      // If we deleted the current plan, switch to another or default
      if (currentPlanName === name) {
        const remainingPlans = availablePlans.filter(p => p !== name);
        if (remainingPlans.length > 0) {
          handleSwitchPlan(remainingPlans[0]);
        } else {
          setCurrentPlanName('default');
          localStorage.setItem(CURRENT_PLAN_KEY, 'default');
          setData(null);
        }
      }

      fetchPlans();
    } catch (error) {
      console.error('[FRONTEND] Delete failed', error);
      alert('Failed to delete plan. Please check your connection.');
    }
  };

  const handleCreateNew = () => {
    const name = `New Plan ${availablePlans.length + 1}`;
    setCurrentPlanName(name);
    localStorage.setItem(CURRENT_PLAN_KEY, name);
    setData(null);
    setIsPlanMenuOpen(false);
  };

  const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const { nodes, edges } = parseOrgCsv(text);
      
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      
      const newData: PlanData = { 
        name: fileName, 
        nodes, 
        edges, 
        lastUpdated: new Date().toISOString() 
      };
      
      setForceFitView(true);
      setData(newData);
      setCurrentPlanName(fileName);
      localStorage.setItem(CURRENT_PLAN_KEY, fileName);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${fileName}`, JSON.stringify(newData));
      if (serverReachable) await syncToServer(newData);
      fetchPlans();
      setIsPlanMenuOpen(false);
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [serverReachable, syncToServer, fetchPlans]);

  const handleExportRecruiterView = useCallback(() => {
    if (!data) return;
    const csv = exportRecruiterViewToCsv(data.nodes, data.edges);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `recruiter_view_${data.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data]);

  const handleImportRecruiterView = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !data) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      
      // 1. Export current recruiter view to a temp "revert" file (download)
      const currentRecruiterCsv = exportRecruiterViewToCsv(data.nodes, data.edges);
      const blob = new Blob([currentRecruiterCsv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const revertFileName = `REVERT_recruiter_view_${data.name}_${Date.now()}.csv`;
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', revertFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Perform the import
      const { nodes: nextNodes, edges: nextEdges } = importRecruiterViewFromCsv(data.nodes, data.edges, text);
      
      setForceFitView(true);
      const newState: PlanData = {
        ...data,
        nodes: nextNodes,
        edges: nextEdges,
        lastUpdated: new Date().toISOString()
      };

      setData(newState);
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${newState.name}`, JSON.stringify(newState));
      if (serverReachable) await syncToServer(newState);
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [data, serverReachable, syncToServer]);

  const handleImportSettings = async (planName: string) => {
    if (!data || !serverReachable) return;

    try {
      const response = await fetch(`${API_URL}/load/${encodeURIComponent(planName)}`);
      if (response.ok) {
        const targetPlan: LegacyPlanData = await response.json();
        let importedViewState: ViewState | undefined;

        // Extract viewState from target plan, handling migration if necessary
        if (targetPlan.viewState) {
          importedViewState = targetPlan.viewState;
        } else if (targetPlan.maxDepth || targetPlan.leafColumns || targetPlan.leadershipLayers) {
          importedViewState = {
            maxDepth: targetPlan.maxDepth,
            leafColumns: targetPlan.leafColumns,
            collapsedNodes: targetPlan.collapsedNodes,
            expandedNodes: targetPlan.expandedNodes,
            leadershipLayers: targetPlan.leadershipLayers,
            nodeFilters: targetPlan.nodeFilters,
            filterGroups: targetPlan.filterGroups,
            defaultFallbackColor: targetPlan.defaultFallbackColor,
            connectionColor: targetPlan.connectionColor,
            backgroundColor: targetPlan.backgroundColor,
            searchShortcut: targetPlan.searchShortcut,
            teamsShortcut: targetPlan.teamsShortcut,
            companyDomain: targetPlan.companyDomain,
            outlookBaseUrl: targetPlan.outlookBaseUrl
          };
        }

        if (importedViewState) {
          // Merge with current viewState to preserve things like collapsed nodes if desired, 
          // or just overwrite settings-related things.
          // User asked to "import the settings", so we'll overwrite common settings.
          const currentViewState = data.viewState || {};
          const newViewState: ViewState = {
            ...currentViewState,
            ...importedViewState,
            // We might want to KEEP current expanded/collapsed state as they are data-specific,
            // but the prompt said "import settings". Let's decide which are settings.
            // Usually filters, layers, shortcuts, domains are settings.
            // collapsed/expanded are more like "current view state".
            collapsedNodes: currentViewState.collapsedNodes,
            expandedNodes: currentViewState.expandedNodes,
          };

          handleDataChange({ viewState: newViewState });
        }
      }
    } catch (error) {
      console.error('[FRONTEND] Failed to import settings', error);
      alert('Failed to import settings from plan.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse flex items-center gap-2">
          <RefreshCw className="animate-spin h-5 w-5" />
          Loading plan [ {currentPlanName} ] ...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                ref={planMenuButtonRef}
                onClick={() => setIsPlanMenuOpen(!isPlanMenuOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                title="Manage Plans"
              >
                <FolderOpen className="h-6 w-6" />
              </button>
              
              {isPlanMenuOpen && (
                <div 
                  ref={planMenuRef}
                  className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-2"
                >
                  <div className="px-4 py-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Plans</span>
                  </div>
                  {availablePlans.map(plan => (
                    <div 
                      key={plan}
                      className={`group w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50 ${
                        currentPlanName === plan ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <button
                        onClick={() => handleSwitchPlan(plan)}
                        className={`flex-1 min-w-0 text-left flex items-center justify-between gap-2 ${
                          currentPlanName === plan ? "text-blue-600 font-bold" : "text-slate-600"
                        }`}
                      >
                        <span className="truncate">{plan}</span>
                        {currentPlanName === plan && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      </button>
                      
                      <button
                        onClick={(e) => handleDeletePlan(plan, e)}
                        className="ml-2 p-1 text-slate-300 hover:text-red-500 rounded transition-colors shrink-0"
                        title="Delete Plan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <button
                      onClick={handleCreateNew}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Plan
                    </button>
                    <button
                      onClick={() => importInputRef.current?.click()}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
                    >
                      <FileUp className="h-4 w-4" />
                      Import CSV
                    </button>
                    <input 
                      type="file" 
                      ref={importInputRef} 
                      className="hidden" 
                      accept=".csv" 
                      onChange={handleImportFile} 
                    />

                    {data && (
                      <>
                        <button
                          onClick={() => updateInputRef.current?.click()}
                          className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Update current Plan
                        </button>
                        <input 
                          type="file" 
                          ref={updateInputRef} 
                          className="hidden" 
                          accept=".csv" 
                          onChange={handleUpdatePlan} 
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <EditableTitle 
                value={data?.name || currentPlanName} 
                onChange={handleRename}
              />
              {data && (
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <button
                    onClick={() => setCurrentView('chart')}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      currentView === 'chart' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LayoutPanelLeft className="h-3.5 w-3.5" />
                    ORG CHART
                  </button>
                  <button
                    onClick={() => setCurrentView('salary')}
                    className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      currentView === 'salary' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    SALARY BANDS
                  </button>
                </div>
              )}
              {data && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                  {saveStatus === 'saving' && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />}
                  {saveStatus === 'saved' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {saveStatus === 'offline' && <CloudOff className="h-3.5 w-3.5 text-slate-400" />}
                  {saveStatus === 'error' && <CloudOff className="h-3.5 w-3.5 text-red-500" />}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Saved' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {data && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
                {isRecruiterMode && (
                  <div className="flex items-center gap-2 mr-4 animate-in fade-in slide-in-from-right-4">
                    <button
                      onClick={handleExportRecruiterView}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors border border-blue-100"
                      title="Export Vacancies to CSV"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export Vacancies
                    </button>
                    <button
                      onClick={() => recruiterImportInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors border border-emerald-100"
                      title="Import Vacancies from CSV"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Import Vacancies
                    </button>
                    <input 
                      type="file" 
                      ref={recruiterImportInputRef} 
                      className="hidden" 
                      accept=".csv" 
                      onChange={handleImportRecruiterView} 
                    />
                  </div>
                )}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recruiter Mode</span>
                  <span className="text-[9px] text-slate-400 italic">Focus on vacancies</span>
                </div>
                <button 
                  onClick={() => setIsRecruiterMode(!isRecruiterMode)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isRecruiterMode ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isRecruiterMode ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>
              <button 
                onClick={() => setIsStatsModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-sm font-medium transition-colors"
              >
                {data.nodes.length} Positions
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={data ? "px-2 py-3" : "max-w-7xl mx-auto px-4 py-12"}>
        {!data ? (
          <div className="max-w-xl mx-auto">
            <FileUpload onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <div className="h-[calc(100vh-88px)]">
            {currentView === 'chart' ? (
              <div className="h-full min-h-[500px]">
                <OrgChart 
                  key={data.name}
                  initialNodes={data.nodes} 
                  initialEdges={data.edges}
                  initialViewState={data.viewState}
                  onDataChange={handleDataChange}
                  isRecruiterMode={isRecruiterMode}
                  availablePlans={availablePlans}
                  onImportSettings={handleImportSettings}
                  forceFitView={forceFitView}
                />
              </div>
            ) : (
              <SalaryBandPlanner 
                jobFamilies={data.jobFamilies || []}
                onDataChange={(jobFamilies) => handleDataChange({ jobFamilies })}
              />
            )}

            <StatsModal 
              isOpen={isStatsModalOpen}
              onClose={() => setIsStatsModalOpen(false)}
              nodes={data.nodes}
              edges={data.edges}
              scratchpadFilters={data.viewState?.nodeFilters || []}
              filterGroups={data.viewState?.filterGroups || []}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
