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
import { Search, Download } from 'lucide-react';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

import { PersonNode } from './PersonNode';
import { EditNodeModal } from './EditNodeModal';
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

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

interface OrgChartProps {
  initialNodes: OrgNode[];
  initialEdges: OrgEdge[];
}

const OrgChartInner: React.FC<OrgChartProps> = ({ initialNodes, initialEdges }) => {
  const { getViewport, setViewport, getNode } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNode, setEditingNode] = useState<{ id: string, data: any } | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Track the last toggled node to maintain its screen position
  const lastToggledRef = useRef<{ id: string, oldPos: { x: number, y: number } } | null>(null);

  const onEditNode = useCallback((id: string, data: any) => {
    setEditingNode({ id, data });
  }, []);

  const onToggleCollapse = useCallback((id: string) => {
    // Capture the CURRENT position using getNode which reflects the rendered state
    const node = getNode(id);
    if (node) {
      lastToggledRef.current = { id, oldPos: { ...node.position } };
    }

    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [getNode]);

  const onAddSubordinate = useCallback((parentId: string) => {
    const newId = `empty-${Date.now()}`;
    
    setNodes((nds) => {
      const parentNode = nds.find(n => n.id === parentId);
      const position = parentNode 
        ? { x: parentNode.position.x, y: parentNode.position.y + 200 }
        : { x: 0, y: 0 };

      const newNode: any = {
        id: newId,
        type: 'person',
        data: {
          firstName: '',
          lastName: '',
          jobTitle: 'New Position',
          team: parentNode?.data.team || '',
          status: 'EMPTY',
        },
        position,
      };
      return nds.concat(newNode);
    });

    setEdges((eds) => eds.concat({
      id: `e-${parentId}-${newId}`,
      source: parentId,
      target: newId,
    }));
  }, [setNodes, setEdges]);

  // Sync with initial props
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCollapsedNodes(new Set());
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Derived view state
  const processedElements = useMemo(() => {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const directChildrenMap: Record<string, string[]> = {};
    const descendantsMap: Record<string, string[]> = {};
    
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

    const hiddenNodes = new Set<string>();
    const checkHidden = (nodeId: string, isParentCollapsed: boolean) => {
      const children = directChildrenMap[nodeId] || [];
      const shouldHideChildren = isParentCollapsed || collapsedNodes.has(nodeId);
      children.forEach(childId => {
        if (shouldHideChildren) hiddenNodes.add(childId);
        checkHidden(childId, shouldHideChildren);
      });
    };

    const childIds = new Set(edges.map(e => e.target));
    nodes.filter(n => !childIds.has(n.id)).forEach(root => checkHidden(root.id, false));

    const preparedNodes = nodes.map(node => {
      const matchesSearch = searchQuery === '' || 
        node.data.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.data.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.data.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.data.team?.toLowerCase().includes(searchQuery.toLowerCase());

      return {
        ...node,
        hidden: hiddenNodes.has(node.id),
        data: {
          ...node.data,
          onAddSubordinate,
          onEditNode,
          onToggleCollapse,
          isCollapsed: collapsedNodes.has(node.id),
          directReportsCount: (directChildrenMap[node.id] || []).length,
          totalReportsCount: getDescendants(node.id).length,
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
    
    const { nodes: layoutedNodes } = getLayoutedElements(visibleNodes, visibleEdges);

    const finalNodes = preparedNodes.map(node => {
      const layouted = layoutedNodes.find(ln => ln.id === node.id);
      return layouted ? { ...node, position: layouted.position } : node;
    });

    return { nodes: finalNodes, edges: preparedEdges };
  }, [nodes, edges, collapsedNodes, searchQuery, onAddSubordinate, onEditNode, onToggleCollapse]);

  // Adjust viewport to keep toggled node stable
  useEffect(() => {
    if (lastToggledRef.current) {
      const { id, oldPos } = lastToggledRef.current;
      const newNode = processedElements.nodes.find(n => n.id === id);
      
      if (newNode) {
        const { x: vx, y: vy, zoom } = getViewport();
        
        // Calculate new viewport to keep the node at the same screen position
        const nextVx = vx + (oldPos.x - newNode.position.x) * zoom;
        const nextVy = vy + (oldPos.y - newNode.position.y) * zoom;

        setViewport({ x: nextVx, y: nextVy, zoom }, { duration: 400 });
      }
      lastToggledRef.current = null;
    }
  }, [processedElements.nodes, getViewport, setViewport]);

  const handleSaveNode = useCallback((updatedData: any) => {
    if (!editingNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNode.id) {
          return {
            ...node,
            data: { ...node.data, ...updatedData },
          };
        }
        return node;
      })
    );
    setEditingNode(null);
  }, [editingNode, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) =>
      setEdges((els) => updateEdge(oldEdge, newConnection, els)),
    [setEdges]
  );

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: nextNodes, edges: nextEdges } = getLayoutedElements(nodes, edges, direction);
      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [nodes, edges, setNodes, setEdges]
  );

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

  return (
    <div className="w-full h-[800px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner relative">
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
            onClick={() => onLayout('TB')}
            className="px-4 py-2 text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-sm"
          >
            Vertical Layout
          </button>
          <button
            onClick={() => onLayout('LR')}
            className="px-4 py-2 text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-sm"
          >
            Horizontal Layout
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
      </ReactFlow>

      {editingNode && (
        <EditNodeModal
          isOpen={!!editingNode}
          nodeData={editingNode.data}
          onClose={() => setEditingNode(null)}
          onSave={handleSaveNode}
        />
      )}
    </div>
  );
};

export const OrgChart: React.FC<OrgChartProps> = (props) => (
  <ReactFlowProvider>
    <OrgChartInner {...props} />
  </ReactFlowProvider>
);
