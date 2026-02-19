import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  updateEdge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import type { Connection, Edge } from 'reactflow';
import { Search, Download, Layers, Settings as SettingsIcon } from 'lucide-react';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

import { PersonNode } from './PersonNode';
import { EditNodeModal } from './EditNodeModal';
import { SettingsModal } from './SettingsModal';
import { exportToCsv } from '../utils/csvParser';
import type { OrgNode, OrgEdge } from '../utils/csvParser';

const nodeTypes = {
  person: PersonNode,
};

const defaultEdgeOptions = {
  type: ConnectionLineType.SmoothStep,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8',
  },
  style: {
    strokeWidth: 2,
    stroke: '#94a3b8',
  },
};

const nodeWidth = 240;
const nodeHeight = 150;
const horizontalSpacing = 50;
const verticalSpacing = 50;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB', leafColumns = 1) => {
  const isHorizontal = direction === 'LR';
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 70, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  const childrenMap: Record<string, string[]> = {};
  edges.forEach(edge => {
    if (!childrenMap[edge.source]) childrenMap[edge.source] = [];
    childrenMap[edge.source].push(edge.target);
  });

  const parentMap: Record<string, string> = {};
  edges.forEach(edge => {
    parentMap[edge.target] = edge.source;
  });

  const isLeaf = (nodeId: string) => !childrenMap[nodeId] || childrenMap[nodeId].length === 0;

  const leafGroups: Record<string, string[]> = {};
  if (leafColumns > 1) {
    nodes.forEach(node => {
      const parentId = parentMap[node.id];
      if (parentId && isLeaf(node.id)) {
        if (!leafGroups[parentId]) leafGroups[parentId] = [];
        leafGroups[parentId].push(node.id);
      }
    });
  }

  nodes.forEach((node) => {
    const parentId = parentMap[node.id];
    if (leafGroups[parentId]?.includes(node.id)) {
      const groupId = `group-${parentId}`;
      if (!g.hasNode(groupId)) {
        const groupLeafCount = leafGroups[parentId].length;
        const rows = Math.ceil(groupLeafCount / leafColumns);
        const gWidth = nodeWidth * leafColumns + horizontalSpacing * (leafColumns - 1);
        const gHeight = nodeHeight * rows + verticalSpacing * (rows - 1);
        g.setNode(groupId, { width: gWidth, height: gHeight });
        g.setEdge(parentId, groupId);
      }
    } else {
      g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    }
  });

  edges.forEach((edge) => {
    if (!leafGroups[edge.source]?.includes(edge.target) && !leafGroups[parentMap[edge.target]]?.includes(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const finalNodes: any[] = [];
  nodes.forEach((node) => {
    const parentId = parentMap[node.id];
    if (leafGroups[parentId]?.includes(node.id)) {
      const groupId = `group-${parentId}`;
      const groupPos = g.node(groupId);
      const groupLeaves = leafGroups[parentId];
      const index = groupLeaves.indexOf(node.id);
      const row = Math.floor(index / leafColumns);
      const col = index % leafColumns;
      const totalRows = Math.ceil(groupLeaves.length / leafColumns);
      const groupWidth = nodeWidth * leafColumns + horizontalSpacing * (leafColumns - 1);
      const groupHeight = nodeHeight * totalRows + verticalSpacing * (totalRows - 1);
      const startX = groupPos.x - groupWidth / 2;
      const startY = groupPos.y - groupHeight / 2;
      const x = startX + col * (nodeWidth + horizontalSpacing) + nodeWidth / 2;
      const y = startY + row * (nodeHeight + verticalSpacing) + nodeHeight / 2;
      finalNodes.push({
        ...node,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
        position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 },
      });
    } else {
      const nodeWithPosition = g.node(node.id);
      if (nodeWithPosition) {
        finalNodes.push({
          ...node,
          targetPosition: isHorizontal ? 'left' : 'top',
          sourcePosition: isHorizontal ? 'right' : 'bottom',
          position: {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
          },
        });
      }
    }
  });

  return { nodes: finalNodes, edges };
};

interface OrgChartProps {
  initialNodes: OrgNode[];
  initialEdges: OrgEdge[];
  initialViewState?: {
    maxDepth?: number;
    leafColumns?: number;
    collapsedNodes?: string[];
    expandedNodes?: string[];
  };
  onDataChange?: (state: any) => void;
  isRecruiterMode?: boolean;
}

const OrgChartInner: React.FC<OrgChartProps> = ({ 
  initialNodes, 
  initialEdges,
  initialViewState = {},
  onDataChange,
  isRecruiterMode = false
}) => {
  const { getViewport, setViewport, getNode, fitView } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNode, setEditingNode] = useState<{ id: string, data: any } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set(initialViewState.collapsedNodes || []));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(initialViewState.expandedNodes || []));
  const [leafColumns, setLeafColumns] = useState<number>(initialViewState.leafColumns || 1);
  const [maxDepth, setMaxDepth] = useState<number>(initialViewState.maxDepth || 10);
  
  const lastToggledRef = useRef<{ id: string, oldPos: { x: number, y: number } } | null>(null);
  const isFirstMount = useRef(true);
  const lastSavedRef = useRef<string>('');

  // Sync settings from props if they change externally
  useEffect(() => {
    if (initialViewState.leafColumns !== undefined) setLeafColumns(initialViewState.leafColumns);
    if (initialViewState.maxDepth !== undefined) setMaxDepth(initialViewState.maxDepth);
    if (initialViewState.collapsedNodes !== undefined) setCollapsedNodes(new Set(initialViewState.collapsedNodes));
    if (initialViewState.expandedNodes !== undefined) setExpandedNodes(new Set(initialViewState.expandedNodes));
  }, [initialViewState.leafColumns, initialViewState.maxDepth, initialViewState.collapsedNodes, initialViewState.expandedNodes]);

  // Handle dynamic max depth calculation if not provided
  useEffect(() => {
    if (initialViewState.maxDepth === undefined && initialEdges.length > 0) {
      const directChildrenMap: Record<string, string[]> = {};
      initialEdges.forEach(edge => {
        if (!directChildrenMap[edge.source]) directChildrenMap[edge.source] = [];
        directChildrenMap[edge.source].push(edge.target);
      });
      let currentMax = 0;
      const findMaxDepth = (nodeId: string, depth: number) => {
        currentMax = Math.max(currentMax, depth);
        (directChildrenMap[nodeId] || []).forEach(childId => findMaxDepth(childId, depth + 1));
      };
      const childIds = new Set(initialEdges.map(e => e.target));
      initialNodes.filter(n => !childIds.has(n.id)).forEach(root => findMaxDepth(root.id, 1));
      setMaxDepth(currentMax || 1);
    }
  }, [initialNodes, initialEdges, initialViewState.maxDepth]);

  // Sync / Auto-save logic
  useEffect(() => {
    if (!onDataChange || nodes.length === 0) return;

    const currentState = {
      nodes,
      edges,
      viewState: {
        maxDepth,
        leafColumns,
        collapsedNodes: Array.from(collapsedNodes),
        expandedNodes: Array.from(expandedNodes),
      }
    };

    const stateString = JSON.stringify(currentState);
    
    // Initialize ref on first run
    if (lastSavedRef.current === '') {
      lastSavedRef.current = stateString;
      return;
    }

    const timer = setTimeout(() => {
      if (stateString !== lastSavedRef.current) {
        lastSavedRef.current = stateString;
        onDataChange(currentState);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [nodes, edges, maxDepth, leafColumns, collapsedNodes, expandedNodes, onDataChange]);

  const onEditNode = useCallback((id: string, data: any) => {
    setEditingNode({ id, data });
  }, []);

  const onToggleCollapse = useCallback((id: string) => {
    const node = getNode(id);
    if (node) {
      lastToggledRef.current = { id, oldPos: { ...node.position } };
    }

    const isCurrentlyCollapsed = (node?.data as any).isCollapsed;

    if (isCurrentlyCollapsed) {
      setCollapsedNodes(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setExpandedNodes(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } else {
      setCollapsedNodes(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setExpandedNodes(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [getNode]);

  const onAddSubordinate = useCallback((parentId: string) => {
    const newId = `empty-${Date.now()}`;
    const parentNode = nodes.find(n => n.id === parentId);
    
    const newNode: any = {
      id: newId,
      type: 'person',
      data: {
        firstName: '',
        lastName: '',
        jobTitle: 'New Position',
        team: parentNode?.data.team || '',
        status: 'EMPTY',
        startDate: '',
        exitDate: '',
      },
      position: parentNode 
        ? { x: parentNode.position.x, y: parentNode.position.y + 200 }
        : { x: 0, y: 0 },
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat({
      id: `e-${parentId}-${newId}`,
      source: parentId,
      target: newId,
    }));
  }, [nodes, setNodes, setEdges]);

  const processedElements = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const directChildrenMap: Record<string, string[]> = {};
    const descendantsMap: Record<string, string[]> = {};
    const nodeMap: Record<string, any> = {};
    
    nodes.forEach(n => {
      nodeMap[n.id] = n;
    });

    edges.forEach(edge => {
      if (!directChildrenMap[edge.source]) directChildrenMap[edge.source] = [];
      directChildrenMap[edge.source].push(edge.target);
    });

    const getDescendants = (nodeId: string): string[] => {
      if (descendantsMap[nodeId]) return descendantsMap[nodeId];
      const children = directChildrenMap[nodeId] || [];
      let descendants = [...children];
      for (const childId of children) {
        descendants = [...descendants, ...getDescendants(childId)];
      }
      descendantsMap[nodeId] = descendants;
      return descendants;
    };

    // Pre-calculate which nodes lead to an empty position for Recruiter Mode
    const hasEmptyDescendantMap: Record<string, boolean> = {};
    const checkEmpty = (nodeId: string): boolean => {
      if (hasEmptyDescendantMap[nodeId] !== undefined) return hasEmptyDescendantMap[nodeId];
      
      const children = directChildrenMap[nodeId] || [];
      const hasEmptyChild = children.some(cid => {
        const child = nodeMap[cid];
        return child?.data.status === 'EMPTY' || checkEmpty(cid);
      });
      
      hasEmptyDescendantMap[nodeId] = hasEmptyChild;
      return hasEmptyChild;
    };
    
    if (isRecruiterMode) {
      nodes.forEach(n => checkEmpty(n.id));
    }

    const nodeDepths: Record<string, number> = {};
    const hiddenNodes = new Set<string>();
    const childIds = new Set(edges.map(e => e.target));
    const roots = nodes.filter(n => !childIds.has(n.id));

    const processHierarchy = (nodeId: string, depth: number, isParentHidden: boolean) => {
      nodeDepths[nodeId] = depth;
      const children = directChildrenMap[nodeId] || [];
      const node = nodeMap[nodeId];
      const isVacancy = node?.data.status === 'EMPTY';
      const leadsToVacancy = hasEmptyDescendantMap[nodeId];

      let isThisNodeHidden = isParentHidden;
      if (isRecruiterMode && !isParentHidden) {
        // In Recruiter Mode, hide nodes that aren't vacancies and don't lead to one
        if (!isVacancy && !leadsToVacancy) {
          isThisNodeHidden = true;
        }
      }

      if (isThisNodeHidden) hiddenNodes.add(nodeId);
      
      let areChildrenHidden = isThisNodeHidden || collapsedNodes.has(nodeId) || (depth >= maxDepth && !expandedNodes.has(nodeId));
      
      // Force expansion/collapse in Recruiter Mode
      if (isRecruiterMode && !isThisNodeHidden) {
        if (leadsToVacancy) {
          // If it DOES lead to a vacancy, ensure it stays expanded to show the path
          areChildrenHidden = false;
        } else {
          // Otherwise collapse children (they are likely hidden anyway, but for consistency)
          if (children.length > 0) areChildrenHidden = true;
        }
      }

      children.forEach(childId => {
        processHierarchy(childId, depth + 1, areChildrenHidden);
      });
    };

    roots.forEach(root => processHierarchy(root.id, 1, false));

    const preparedNodes = nodes.map(node => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        node.data.firstName?.toLowerCase().includes(query) ||
        node.data.lastName?.toLowerCase().includes(query) ||
        node.data.jobTitle?.toLowerCase().includes(query) ||
        node.data.team?.toLowerCase().includes(query) ||
        (node.data.status === 'EMPTY' && 'empty'.includes(query));

      const depth = nodeDepths[node.id] || 1;
      let isCollapsed = collapsedNodes.has(node.id) || (depth >= maxDepth && !expandedNodes.has(node.id));

      if (isRecruiterMode) {
        const leadsToVacancy = hasEmptyDescendantMap[node.id];
        isCollapsed = !leadsToVacancy && (directChildrenMap[node.id]?.length > 0);
      }

      return {
        ...node,
        hidden: hiddenNodes.has(node.id),
        data: {
          ...node.data,
          onAddSubordinate,
          onEditNode,
          onToggleCollapse,
          isCollapsed,
          directReportsCount: (directChildrenMap[node.id] || []).length,
          totalReportsCount: getDescendants(node.id).length,
          depth,
        },
        style: {
          ...node.style,
          opacity: matchesSearch ? 1 : 0.3,
          border: matchesSearch && searchQuery !== '' ? '2px solid #3b82f6' : node.style?.border,
        },
      };
    });

    const preparedEdges = edges.map(edge => ({
      ...edge,
      hidden: hiddenNodes.has(edge.source) || hiddenNodes.has(edge.target),
    }));

    const visibleNodes = preparedNodes.filter(n => !n.hidden);
    const visibleEdges = preparedEdges.filter(e => !e.hidden);
    const { nodes: layoutedNodes } = getLayoutedElements(visibleNodes, visibleEdges, 'TB', leafColumns);

    const finalNodes = preparedNodes.map(node => {
      const layouted = layoutedNodes.find(ln => ln.id === node.id);
      return layouted ? { ...node, position: layouted.position } : node;
    });

    return { nodes: finalNodes, edges: preparedEdges };
  }, [nodes, edges, collapsedNodes, expandedNodes, searchQuery, maxDepth, leafColumns, onAddSubordinate, onEditNode, onToggleCollapse, isRecruiterMode]);

  useEffect(() => {
    if (lastToggledRef.current) {
      const { id, oldPos } = lastToggledRef.current;
      const newNode = processedElements.nodes.find(n => n.id === id);
      if (newNode) {
        const { x: vx, y: vy, zoom } = getViewport();
        const nextVx = vx + (oldPos.x - newNode.position.x) * zoom;
        const nextVy = vy + (oldPos.y - newNode.position.y) * zoom;
        setViewport({ x: nextVx, y: nextVy, zoom }, { duration: 400 });
      }
      lastToggledRef.current = null;
    }
  }, [processedElements.nodes, getViewport, setViewport]);

  useEffect(() => {
    if (isFirstMount.current && nodes.length > 0) {
      fitView({ duration: 0, padding: 0.2 });
      isFirstMount.current = false;
    } else if (nodes.length > 0) {
      fitView({ duration: 400, padding: 0.2 });
    }
  }, [maxDepth, leafColumns, fitView, nodes.length, isRecruiterMode]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    setEditingNode(null);
  }, [setNodes, setEdges]);

  const handleSaveNode = useCallback((updatedData: any) => {
    if (!editingNode) return;
    const { managerId: newManagerId, ...restData } = updatedData;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNode.id) {
          return {
            ...node,
            data: { ...node.data, ...restData },
          };
        }
        return node;
      })
    );

    setEdges((eds) => {
      const currentEdge = eds.find(e => e.target === editingNode.id);
      if (currentEdge) {
        if (newManagerId) {
          return eds.map(e => e.id === currentEdge.id ? { ...e, source: newManagerId } : e);
        } else {
          return eds.filter(e => e.id !== currentEdge.id);
        }
      } else if (newManagerId) {
        return eds.concat({
          id: `e-${newManagerId}-${editingNode.id}`,
          source: newManagerId,
          target: editingNode.id
        });
      }
      return eds;
    });

    setEditingNode(null);
  }, [editingNode, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)), [setEdges]);

  const handleExport = useCallback(() => {
    const csv = exportToCsv(nodes as any, edges as any);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'org_structure_modified.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [nodes, edges]);

  const existingTeams = useMemo(() => {
    const teams = new Set<string>();
    nodes.forEach(node => {
      if (node.data.team) teams.add(node.data.team);
    });
    return Array.from(teams).sort();
  }, [nodes]);

  const possibleManagers = useMemo(() => {
    return nodes
      .map(n => ({
        id: n.id,
        name: n.data.status === 'FILLED' 
          ? `${n.data.firstName} ${n.data.lastName}` 
          : `EMPTY: ${n.data.jobTitle} (${n.id})`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nodes]);

  return (
    <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner relative min-h-[500px]">
      <ReactFlow
        nodes={processedElements.nodes}
        edges={processedElements.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0.1}
      >
        <Panel position="top-left" className="bg-white p-2 rounded-lg shadow-md border border-slate-200 w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, title, team..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Panel>
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <Panel position="top-right" className="bg-white p-2 rounded-lg shadow-md border border-slate-200 flex gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
            title="Chart Settings"
          >
            <SettingsIcon size={20} />
          </button>
          <div className="w-px bg-slate-200 mx-1" />
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </Panel>
        <Panel position="bottom-left" className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-200 max-w-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-1">Planning Mode</h4>
          <p className="text-xs text-slate-500">
            Drag connections between nodes to restructure the hierarchy. Click the edit icon to modify details.
          </p>
        </Panel>
        <Panel position="bottom-right" className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-slate-200 flex flex-col gap-2 items-center mb-12">
          <div className="flex flex-col items-center gap-1 border-b border-slate-100 pb-2 mb-1">
            <Layers size={18} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layers</span>
          </div>
          <button onClick={() => setMaxDepth(prev => Math.min(prev + 1, 20))} className="p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors" title="Show more layers"><span className="text-lg font-bold">+</span></button>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100">{maxDepth}</div>
          <button onClick={() => setMaxDepth(prev => Math.max(prev - 1, 1))} className="p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors" title="Show fewer layers"><span className="text-lg font-bold">−</span></button>
          <button
            onClick={() => {
              const childIds = new Set(edges.map(e => e.target));
              const directChildrenMap: Record<string, string[]> = {};
              edges.forEach(edge => {
                if (!directChildrenMap[edge.source]) directChildrenMap[edge.source] = [];
                directChildrenMap[edge.source].push(edge.target);
              });
              let currentMax = 0;
              const findMaxDepth = (nodeId: string, depth: number) => {
                currentMax = Math.max(currentMax, depth);
                (directChildrenMap[nodeId] || []).forEach(childId => findMaxDepth(childId, depth + 1));
              };
              nodes.filter(n => !childIds.has(n.id)).forEach(root => findMaxDepth(root.id, 1));
              setMaxDepth(currentMax || 1);
              setCollapsedNodes(new Set());
              setExpandedNodes(new Set());
              setLeafColumns(1);
            }}
            className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
          >
            Reset
          </button>
        </Panel>
      </ReactFlow>
      {editingNode && (
        <EditNodeModal 
          isOpen={!!editingNode} 
          nodeData={editingNode.data} 
          nodeId={editingNode.id} 
          existingTeams={existingTeams}
          possibleManagers={possibleManagers}
          currentManagerId={edges.find(e => e.target === editingNode.id)?.source || ''}
          onClose={() => setEditingNode(null)} 
          onSave={handleSaveNode} 
          onDelete={handleDeleteNode} 
        />
      )}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} leafColumns={leafColumns} setLeafColumns={setLeafColumns} />
    </div>
  );
};

export const OrgChart: React.FC<OrgChartProps> = (props) => (
  <ReactFlowProvider>
    <OrgChartInner {...props} />
  </ReactFlowProvider>
);
