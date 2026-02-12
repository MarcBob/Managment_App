import { useState, useEffect, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { OrgChart } from './components/OrgChart';
import type { OrgNode, OrgEdge } from './utils/csvParser';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [data, setData] = useState<{ 
    nodes: OrgNode[]; 
    edges: OrgEdge[];
    collapsedNodes?: string[];
    expandedNodes?: string[];
    maxDepth?: number;
    leafColumns?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);

  // Load saved state on startup
  useEffect(() => {
    const loadState = async () => {
      try {
        console.log('Attempting to load state from server...');
        const response = await fetch(`${API_URL}/load`);
        if (response.ok) {
          const savedState = await response.json();
          console.log('Successfully loaded state from server');
          setData(savedState);
          setHasLoadedFromServer(true);
        } else {
          console.log('No saved state found on server (404)');
        }
      } catch (error) {
        console.warn('Could not connect to persistence server. Auto-save will be disabled.', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  const handleDataLoaded = (nodes: OrgNode[], edges: OrgEdge[]) => {
    setData({ nodes, edges });
    // We didn't load this from server, but we want to start saving now
    setHasLoadedFromServer(true);
  };

  const handleDataChange = useCallback(async (newState: any) => {
    if (!hasLoadedFromServer) return; 

    // Update local state to stay in sync and avoid prop-reversion
    setData(newState);

    try {
      const response = await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      });
      if (!response.ok) {
        console.error('[FRONTEND] Server failed to save state');
      }
    } catch (error) {
      console.error('[FRONTEND] Failed to auto-save state (server unreachable):', error);
    }
  }, [hasLoadedFromServer]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Checking for saved state...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Org Planner</h1>
          {data && (
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to reset the view? This will NOT delete the saved file on the server.')) {
                  setData(null);
                  setHasLoadedFromServer(false);
                  // Give the user a chance to reload or import new
                  setIsLoading(true);
                  setTimeout(() => setIsLoading(false), 100);
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
              <div className="flex gap-4">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
                  {data.nodes.length} Positions
                </span>
                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                  {data.edges.length} Connections
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-h-[500px]">
              <OrgChart 
                initialNodes={data.nodes} 
                initialEdges={data.edges}
                initialCollapsedNodes={data.collapsedNodes}
                initialExpandedNodes={data.expandedNodes}
                initialMaxDepth={data.maxDepth}
                initialLeafColumns={data.leafColumns}
                onDataChange={handleDataChange}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
