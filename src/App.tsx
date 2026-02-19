import { useState, useEffect, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { OrgChart } from './components/OrgChart';
import type { OrgNode, OrgEdge } from './utils/csvParser';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, Briefcase } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:3001/api';
const LOCAL_STORAGE_KEY = 'org-planner-state';

type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';

function App() {
  const [data, setData] = useState<{ 
    nodes: OrgNode[]; 
    edges: OrgEdge[];
    lastUpdated?: string;
    viewState?: {
      maxDepth?: number;
      leafColumns?: number;
      collapsedNodes?: string[];
      expandedNodes?: string[];
    }
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [serverReachable, setServerReachable] = useState(true);
  const [isRecruiterMode, setIsRecruiterMode] = useState(false);

  // Load saved state on startup
  useEffect(() => {
    const loadState = async () => {
      let finalData = null;
      let serverData = null;

      // 1. Try loading from server
      try {
        console.log('[FRONTEND] Loading state from server...');
        const response = await fetch(`${API_URL}/load`);
        if (response.ok) {
          serverData = await response.json();
          // Migration for old flat schema
          if (serverData && !serverData.viewState && (serverData.maxDepth || serverData.leafColumns)) {
            serverData.viewState = {
              maxDepth: serverData.maxDepth,
              leafColumns: serverData.leafColumns,
              collapsedNodes: serverData.collapsedNodes,
              expandedNodes: serverData.expandedNodes
            };
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
        const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localRaw) {
          const localData = JSON.parse(localRaw);
          const serverTime = serverData?.lastUpdated ? new Date(serverData.lastUpdated).getTime() : 0;
          const localTime = localData?.lastUpdated ? new Date(localData.lastUpdated).getTime() : 0;

          console.log('[FRONTEND] Version comparison:', {
            server: serverData?.lastUpdated || 'none',
            local: localData?.lastUpdated || 'none'
          });

          if (localTime > serverTime) {
            console.log('[FRONTEND] LocalStorage version is newer, using it.');
            finalData = localData;
            // If server is reachable, sync the newer local version back to server
            if (serverData && localData.nodes) { // serverData exists means server is reachable
              console.log('[FRONTEND] Syncing newer local version to server...');
              syncToServer(localData);
            }
          } else {
            console.log('[FRONTEND] Server version is newer or equal.');
          }
        }
      } catch (e) {
        console.error('[FRONTEND] Error checking localStorage:', e);
      }

      setData(finalData);
      setIsLoading(false);
    };

    loadState();
  }, [serverReachable]);

  const syncToServer = async (state: any) => {
    try {
      await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch (e) {
      console.warn('[FRONTEND] Initial sync to server failed');
    }
  };

  const handleDataLoaded = (nodes: OrgNode[], edges: OrgEdge[]) => {
    const newData = { nodes, edges, lastUpdated: new Date().toISOString() };
    setData(newData);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
  };

  const handleDataChange = useCallback(async (newState: any) => {
    const timestampedState = {
      ...newState,
      lastUpdated: new Date().toISOString()
    };

    // Update local state immediately
    setData(timestampedState);
    
    // Save to LocalStorage immediately (fast, reliable on refresh)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(timestampedState));
    } catch (e) {
      console.warn('[FRONTEND] LocalStorage save failed', e);
    }

    if (!serverReachable) return;

    setSaveStatus('saving');
    try {
      const response = await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timestampedState),
        // keepalive removed here because payload > 64KB causes rejection in some browsers
        // LocalStorage fallback covers the "refresh during save" case
      });
      if (response.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      setSaveStatus('offline');
      setServerReachable(false);
    }
  }, [serverReachable]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse flex items-center gap-2">
          <RefreshCw className="animate-spin h-5 w-5" />
          Synchronizing with server...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">Org Planner</h1>
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

          {data && (
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to reset the view? This will NOT delete the saved file on the server.')) {
                  localStorage.removeItem(LOCAL_STORAGE_KEY);
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
                key={data.nodes.length > 0 ? 'loaded' : 'empty'}
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
