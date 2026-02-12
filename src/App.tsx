import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { OrgChart } from './components/OrgChart';
import type { OrgNode, OrgEdge } from './utils/csvParser';
import './App.css';

function App() {
  const [data, setData] = useState<{ nodes: OrgNode[]; edges: OrgEdge[] } | null>(null);

  const handleDataLoaded = (nodes: OrgNode[], edges: OrgEdge[]) => {
    setData({ nodes, edges });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Org Planner</h1>
          {data && (
            <button 
              onClick={() => setData(null)}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              Reset
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
              <OrgChart initialNodes={data.nodes} initialEdges={data.edges} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
