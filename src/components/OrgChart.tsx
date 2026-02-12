import { useCallback, useMemo, useState, useEffect } from 'react';
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

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 150;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
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

export const OrgChart: React.FC<OrgChartProps> = ({ initialNodes, initialEdges }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNode, setEditingNode] = useState<{ id: string, data: any } | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const onEditNode = useCallback((id: string, data: any) => {
    setEditingNode({ id, data });
  }, []);

  const onToggleCollapse = useCallback((id: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const onAddSubordinate = useCallback((parentId: string) => {
    setNodes((nds) => {
      const parentNode = nds.find(n => n.id === parentId);
      const newId = `empty-${Date.now()}`;
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
          onAddSubordinate,
          onEditNode,
          onToggleCollapse,
        },
        position,
      };

      setEdges((eds) => eds.concat({
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
      }));

      return nds.concat(newNode);
    });
  }, [onEditNode, onToggleCollapse]);

  const { nodes: initialLayoutedNodes, edges: initialLayoutedEdges } = useMemo(() => {
    const nodesWithAction = initialNodes.map(node => ({
      ...node,
      data: { ...node.data, onAddSubordinate, onEditNode, onToggleCollapse }
    }));
    return getLayoutedElements(nodesWithAction, initialEdges);
  }, [initialNodes, initialEdges, onAddSubordinate, onEditNode, onToggleCollapse]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayoutedEdges);

  const processedElements = useMemo(() => {
    const descendantsMap: Record<string, string[]> = {};
    const directChildrenMap: Record<string, string[]> = {};

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

    nodes.forEach(node => getDescendants(node.id));

    const hiddenNodes = new Set<string>();
    const checkHidden = (nodeId: string, isParentCollapsed: boolean) => {
      const children = directChildrenMap[nodeId] || [];
      const shouldHideChildren = isParentCollapsed || collapsedNodes.has(nodeId);
      
      children.forEach(childId => {
        if (shouldHideChildren) {
          hiddenNodes.add(childId);
        }
        checkHidden(childId, shouldHideChildren);
      });
    };

    const childIds = new Set(edges.map(e => e.target));
    const roots = nodes.filter(n => !childIds.has(n.id));
    roots.forEach(root => checkHidden(root.id, false));

    const updatedNodes = nodes.map(node => ({
      ...node,
      hidden: hiddenNodes.has(node.id),
      data: {
        ...node.data,
        isCollapsed: collapsedNodes.has(node.id),
        directReportsCount: (directChildrenMap[node.id] || []).length,
        totalReportsCount: (descendantsMap[node.id] || []).length,
        onToggleCollapse,
      }
    }));

    const updatedEdges = edges.map(edge => ({
      ...edge,
      hidden: hiddenNodes.has(edge.target) || hiddenNodes.has(edge.source),
    }));

    const visibleNodes = updatedNodes.filter(n => !n.hidden);
    const visibleEdges = updatedEdges.filter(e => !e.hidden);
    const { nodes: layoutedNodes } = getLayoutedElements(visibleNodes, visibleEdges);
    
    const finalNodes = updatedNodes.map(node => {
      const layouted = layoutedNodes.find(ln => ln.id === node.id);
      return layouted ? { ...node, position: layouted.position } : node;
    });

    return { nodes: finalNodes, edges: updatedEdges };
  }, [nodes, edges, collapsedNodes, onToggleCollapse]);

  // Sync the layouted positions back to the main nodes state when collapsedNodes change
  useEffect(() => {
    setNodes((nds) => {
      let changed = false;
      const nextNodes = nds.map((node) => {
        const processed = processedElements.nodes.find((n) => n.id === node.id);
        if (processed && (processed.position.x !== node.position.x || processed.position.y !== node.position.y)) {
          changed = true;
          return { ...node, position: processed.position };
        }
        return node;
      });
      return changed ? nextNodes : nds;
    });
  }, [processedElements.nodes, setNodes]);

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

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const matches = 
          node.data.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.data.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.data.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.data.team?.toLowerCase().includes(searchQuery.toLowerCase());
        
        return {
          ...node,
          style: {
            ...node.style,
            opacity: searchQuery === '' || matches ? 1 : 0.3,
            border: matches && searchQuery !== '' ? '2px solid #3b82f6' : node.style?.border,
          },
        };
      })
    );
  }, [searchQuery, setNodes]);

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
      const { nodes: nextNodes, edges: nextEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );
      setNodes([...nextNodes]);
      setEdges([...nextEdges]);
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
        fitView
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
