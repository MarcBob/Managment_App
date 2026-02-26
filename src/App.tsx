import { useState, useEffect, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { OrgChart } from './components/OrgChart';
import { EditableTitle } from './components/EditableTitle';
import type { OrgNode, OrgEdge } from './utils/csvParser';
import type { LeadershipLayer } from './utils/leadershipLayers';
import type { NodeFilter, FilterGroup } from './utils/nodeFilters';
import { CloudOff, RefreshCw, CheckCircle2, FolderOpen, Plus } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:3001/api';
const LOCAL_STORAGE_KEY = 'org-planner-state';
const CURRENT_PLAN_KEY = 'org-planner-current-plan';

type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';

interface ViewState {
  maxDepth?: number;
  leafColumns?: number;
  collapsedNodes?: string[];
  expandedNodes?: string[];
  leadershipLayers?: LeadershipLayer[];
  nodeFilters?: NodeFilter[];
  filterGroups?: FilterGroup[];
  searchShortcut?: string;
}

interface PlanData {
  name: string;
  nodes: OrgNode[];
  edges: OrgEdge[];
  lastUpdated?: string;
  viewState?: ViewState;
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
  searchShortcut?: string;
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
  const [isPlanMenuOpen, setIsPlanMenuOpen] = useState(false);

  const syncToServer = useCallback(async (state: PlanData) => {
    try {
      const response = await fetch(`${API_URL}/save/${state.name}`, {
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
          if (serverData && !serverData.viewState && (serverData.maxDepth || serverData.leafColumns || serverData.leadershipLayers || serverData.nodeFilters || serverData.filterGroups || serverData.searchShortcut)) {
            serverData.viewState = {
              maxDepth: serverData.maxDepth,
              leafColumns: serverData.leafColumns,
              collapsedNodes: serverData.collapsedNodes,
              expandedNodes: serverData.expandedNodes,
              leadershipLayers: serverData.leadershipLayers,
              nodeFilters: serverData.nodeFilters,
              filterGroups: serverData.filterGroups,
              searchShortcut: serverData.searchShortcut
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

  const handleCreateNew = () => {
    const name = `New Plan ${availablePlans.length + 1}`;
    setCurrentPlanName(name);
    localStorage.setItem(CURRENT_PLAN_KEY, name);
    setData(null);
    setIsPlanMenuOpen(false);
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
                onClick={() => setIsPlanMenuOpen(!isPlanMenuOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                title="Manage Plans"
              >
                <FolderOpen className="h-6 w-6" />
              </button>
              
              {isPlanMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsPlanMenuOpen(false)} 
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-2">
                    <div className="px-4 py-2 border-b border-slate-100 mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Plans</span>
                    </div>
                    {availablePlans.map(plan => (
                      <button
                        key={plan}
                        onClick={() => handleSwitchPlan(plan)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${
                          currentPlanName === plan ? "text-blue-600 font-bold bg-blue-50/50" : "text-slate-600"
                        }`}
                      >
                        <span className="truncate">{plan}</span>
                        {currentPlanName === plan && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                    ))}
                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button
                        onClick={handleCreateNew}
                        className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Create New Plan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <EditableTitle 
                value={data?.name || currentPlanName} 
                onChange={handleRename}
              />
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
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to reset the view? This will NOT delete the saved file on the server.')) {
                  localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${currentPlanName}`);
                  setData(null);
                }
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Reset View
            </button>
          )}
        </div>
      </header>

      <main className={data ? "px-4 py-6" : "max-w-7xl mx-auto px-4 py-12"}>
        {!data ? (
          <div className="max-w-xl mx-auto">
            <FileUpload onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-bold text-slate-900">Organization Chart</h2>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 pr-6 border-r border-slate-200">
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
                <div className="flex gap-4">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
                    {data.nodes.length} Positions
                  </span>
                  <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                    {data.edges.length} Connections
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-[500px]">
              <OrgChart 
                key={`${data.name}-${data.nodes.length}`}
                initialNodes={data.nodes} 
                initialEdges={data.edges}
                initialViewState={data.viewState}
                onDataChange={handleDataChange}
                isRecruiterMode={isRecruiterMode}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
