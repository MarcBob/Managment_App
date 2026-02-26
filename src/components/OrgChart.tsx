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
import type { Connection, Edge, Node } from 'reactflow';
import { Search, Download, Layers, Settings as SettingsIcon, X } from 'lucide-react';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

import { PersonNode } from './PersonNode';
import { TeamGroupNode } from './TeamGroupNode';
import { EditNodeModal } from './EditNodeModal';
import { SettingsModal } from './SettingsModal';
import { exportToCsv } from '../utils/csvParser';
import { getTeamGroups, calculateTeamGroupPositions } from '../utils/teamGrouping';
import { getLeadershipRank } from '../utils/leadershipLayers';
import { getNodeColor, getActiveFilters } from '../utils/nodeFilters';
import type { LeadershipLayer } from '../utils/leadershipLayers';
import type { NodeFilter, FilterGroup } from '../utils/nodeFilters';
import type { OrgNode, OrgEdge } from '../utils/csvParser';

const nodeTypes = {
  person: PersonNode,
  teamGroup: TeamGroupNode,
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

const getLayoutedElements = (
  nodes: any[], 
  edges: any[], 
  direction = 'TB', 
  leafColumns = 1,
  leadershipLayers: LeadershipLayer[] = []
) => {
  const isHorizontal = direction === 'LR';
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 100, ranksep: 100 });
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
  const isRoot = (nodeId: string) => !parentMap[nodeId];

  // 1. Calculate target ranks for all nodes
  const nodeRanks: Record<string, number> = {};
  nodes.forEach(node => {
    nodeRanks[node.id] = getLeadershipRank(
      node.data.jobTitle || '', 
      leadershipLayers, 
      isRoot(node.id)
    );
  });

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

  // 2. Set nodes in dagre
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
        
        // Edge to group node
        const sourceRank = nodeRanks[parentId] ?? 0;
        // Leaf group nodes are usually in the "last layer"
        const targetRank = leadershipLayers.length + 1;
        const minLen = Math.max(1, targetRank - sourceRank);
        g.setEdge(parentId, groupId, { minlen: minLen });
      }
    } else {
      g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    }
  });

  // 3. Set edges with minlen constraints
  edges.forEach((edge) => {
    // Only process edges that are NOT going into a leaf group (those are handled above)
    const isTargetInLeafGroup = leafGroups[parentMap[edge.target]]?.includes(edge.target);
    
    if (!isTargetInLeafGroup) {
      const sourceRank = nodeRanks[edge.source] ?? 0;
      const targetRank = nodeRanks[edge.target] ?? (sourceRank + 1);
      
      // Force minlen to be the difference in ranks
      // This forces Dagre to push the node down to the correct leadership layer
      const minLen = Math.max(1, targetRank - sourceRank);
      g.setEdge(edge.source, edge.target, { minlen: minLen });
    }
  });

  dagre.layout(g);

  // 4. Extract positions
  const finalNodes: any[] = [];
  nodes.forEach((node) => {
    const parentId = parentMap[node.id];
    let position: { x: number, y: number };

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
      position = {
        x: startX + col * (nodeWidth + horizontalSpacing) + nodeWidth / 2,
        y: startY + row * (nodeHeight + verticalSpacing) + nodeHeight / 2,
      };
    } else {
      const nodeWithPosition = g.node(node.id);
      if (nodeWithPosition) {
        position = { x: nodeWithPosition.x, y: nodeWithPosition.y };
      } else {
        position = { x: 0, y: 0 };
      }
    }

    finalNodes.push({
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: position.x - nodeWidth / 2,
        y: position.y - nodeHeight / 2,
      },
    });
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
    leadershipLayers?: LeadershipLayer[];
    nodeFilters?: NodeFilter[];
    filterGroups?: FilterGroup[];
    defaultFallbackColor?: string;
    searchShortcut?: string;
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
  const { getViewport, setViewport, getNode, fitView, fitBounds } = useReactFlow();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNode, setEditingNode] = useState<{ id: string, data: any } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Use separate state for raw data and displayed elements
  const [rawNodes, setRawNodes] = useState<Node[]>(initialNodes);
  const [rawEdges, setRawEdges] = useState<Edge[]>(initialEdges);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set(initialViewState.collapsedNodes || []));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(initialViewState.expandedNodes || []));
  const [leafColumns, setLeafColumns] = useState<number>(initialViewState.leafColumns || 1);
  const [maxDepth, setMaxDepth] = useState<number>(initialViewState.maxDepth || 10);
  const [leadershipLayers, setLeadershipLayers] = useState<LeadershipLayer[]>(initialViewState.leadershipLayers || []);
  const [nodeFilters, setNodeFilters] = useState<NodeFilter[]>(initialViewState.nodeFilters || []);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(initialViewState.filterGroups || []);
  const [defaultFallbackColor, setDefaultFallbackColor] = useState<string>(initialViewState.defaultFallbackColor || '#ffffff');
  const [searchShortcut, setSearchShortcut] = useState<string>(initialViewState.searchShortcut || 'meta+e');
  
  const lastToggledRef = useRef<{ id: string, oldPos: { x: number, y: number } } | null>(null);
  const isFirstMount = useRef(true);
  const lastSavedRef = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync initial data
  useEffect(() => {
    setRawNodes(initialNodes);
    setRawEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  // Sync settings from props
  useEffect(() => {
    if (initialViewState.leafColumns !== undefined) setLeafColumns(initialViewState.leafColumns);
    if (initialViewState.maxDepth !== undefined) setMaxDepth(initialViewState.maxDepth);
    if (initialViewState.collapsedNodes !== undefined) setCollapsedNodes(new Set(initialViewState.collapsedNodes));
    if (initialViewState.expandedNodes !== undefined) setExpandedNodes(new Set(initialViewState.expandedNodes));
    if (initialViewState.leadershipLayers !== undefined) setLeadershipLayers(initialViewState.leadershipLayers);
    if (initialViewState.nodeFilters !== undefined) setNodeFilters(initialViewState.nodeFilters);
    if (initialViewState.filterGroups !== undefined) setFilterGroups(initialViewState.filterGroups);
    if (initialViewState.defaultFallbackColor !== undefined) setDefaultFallbackColor(initialViewState.defaultFallbackColor);
    if (initialViewState.searchShortcut !== undefined) setSearchShortcut(initialViewState.searchShortcut);
  }, [initialViewState.leafColumns, initialViewState.maxDepth, initialViewState.collapsedNodes, initialViewState.expandedNodes, initialViewState.leadershipLayers, initialViewState.nodeFilters, initialViewState.filterGroups, initialViewState.defaultFallbackColor, initialViewState.searchShortcut]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input (unless it's the search input itself, but that's fine)
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        if (document.activeElement !== searchInputRef.current) {
          return;
        }
      }

      const parts = searchShortcut.toLowerCase().split('+');
      const key = parts[parts.length - 1];
      const hasMeta = parts.includes('meta') || parts.includes('command') || parts.includes('cmd');
      const hasCtrl = parts.includes('ctrl');
      const hasAlt = parts.includes('alt');
      const hasShift = parts.includes('shift');

      const metaMatch = hasMeta ? (e.metaKey || (navigator.platform.toUpperCase().indexOf('MAC') === -1 && e.ctrlKey)) : !e.metaKey;
      const ctrlMatch = hasCtrl ? e.ctrlKey : !e.ctrlKey;
      const altMatch = hasAlt ? e.altKey : !e.altKey;
      const shiftMatch = hasShift ? e.shiftKey : !e.shiftKey;

      if (metaMatch && ctrlMatch && altMatch && shiftMatch && e.key.toLowerCase() === key) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [searchShortcut]);
  // Handle structural or filter changes with side-effect layout
  useEffect(() => {
    if (rawNodes.length === 0) return;

    // 1. Build hierarchy information
    const directChildrenMap: Record<string, string[]> = {};
    const descendantsMap: Record<string, string[]> = {};
    const nodeMap: Record<string, any> = {};
    
    rawNodes.forEach(n => {
      nodeMap[n.id] = n;
    });

    rawEdges.forEach(edge => {
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
    
    if (isRecruiterMode) rawNodes.forEach(n => checkEmpty(n.id));

    const nodeDepths: Record<string, number> = {};
    const hiddenNodes = new Set<string>();
    const childIds = new Set(rawEdges.map(e => e.target));
    const roots = rawNodes.filter(n => !childIds.has(n.id));

    const processHierarchy = (nodeId: string, depth: number, isParentHidden: boolean) => {
      nodeDepths[nodeId] = depth;
      const children = directChildrenMap[nodeId] || [];
      const node = nodeMap[nodeId];
      const isVacancy = node?.data.status === 'EMPTY';
      const leadsToVacancy = hasEmptyDescendantMap[nodeId];

      let isThisNodeHidden = isParentHidden;
      if (isRecruiterMode && !isParentHidden) {
        if (!isVacancy && !leadsToVacancy) isThisNodeHidden = true;
      }
      if (isThisNodeHidden) hiddenNodes.add(nodeId);
      
      let areChildrenHidden = isThisNodeHidden || collapsedNodes.has(nodeId) || (depth >= maxDepth && !expandedNodes.has(nodeId));
      if (isRecruiterMode && !isThisNodeHidden) {
        if (leadsToVacancy) areChildrenHidden = false;
        else if (children.length > 0) areChildrenHidden = true;
      }
      children.forEach(childId => processHierarchy(childId, depth + 1, areChildrenHidden));
    };

    roots.forEach(root => processHierarchy(root.id, 1, false));

    // 2. Prepare nodes for layout
    const query = searchQuery.toLowerCase().trim();
    const queryParts = query.split(/\s+/).filter(p => p !== '');
    
    const preparedNodes = rawNodes.map(node => {
      const firstName = node.data.firstName?.toLowerCase() || '';
      const lastName = node.data.lastName?.toLowerCase() || '';
      const jobTitle = node.data.jobTitle?.toLowerCase() || '';
      const team = node.data.team?.toLowerCase() || '';
      const statusText = node.data.status === 'EMPTY' ? 'empty' : '';

      const matchesSearch = searchQuery === '' || queryParts.every(part => 
        firstName.includes(part) || 
        lastName.includes(part) || 
        jobTitle.includes(part) || 
        team.includes(part) || 
        statusText.includes(part)
      );

      const depth = nodeDepths[node.id] || 1;
      let isCollapsed = collapsedNodes.has(node.id) || (depth >= maxDepth && !expandedNodes.has(node.id));
      if (isRecruiterMode) {
        const leadsToVacancy = hasEmptyDescendantMap[node.id];
        isCollapsed = !leadsToVacancy && (directChildrenMap[node.id]?.length > 0);
      }

      const allActiveFilters = getActiveFilters(nodeFilters, filterGroups);
      const activeGroups = filterGroups.filter(g => g.enabled);
      const groupFallbackColor = activeGroups.length > 0 ? activeGroups[0].defaultFallbackColor : defaultFallbackColor;

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
          customColor: getNodeColor(node.data.jobTitle || '', allActiveFilters, '', groupFallbackColor),
        },
        style: {
          ...node.style,
          opacity: matchesSearch ? 1 : 0.3,
          border: matchesSearch && searchQuery !== '' ? '2px solid #3b82f6' : node.style?.border,
        },
      };
    });

    const visibleNodes = preparedNodes.filter(n => !n.hidden);
    const visibleEdges = rawEdges.filter(e => !hiddenNodes.has(e.source) && !hiddenNodes.has(e.target));
    
    const { nodes: layoutedNodes } = getLayoutedElements(visibleNodes, visibleEdges, 'TB', leafColumns, leadershipLayers);

    const finalNodes = preparedNodes.map(node => {
      const layouted = layoutedNodes.find(ln => ln.id === node.id);
      return layouted ? { 
        ...node, 
        position: layouted.position,
        width: nodeWidth,
        height: nodeHeight
      } : node;
    });

    // 3. Team Groups
    const teamGroups = getTeamGroups(visibleNodes, visibleEdges);
    const teamGroupPositions = calculateTeamGroupPositions(teamGroups, finalNodes, nodeWidth, nodeHeight, 20);
    
    const teamGroupNodes = teamGroupPositions.map(pos => ({
      id: pos.id,
      type: 'teamGroup',
      position: { x: pos.x, y: pos.y },
      width: pos.width,
      height: pos.height,
      data: { team: pos.team },
      style: { 
        width: pos.width, 
        height: pos.height,
        pointerEvents: 'none' as any,
      },
      draggable: false,
      selectable: false,
    }));

    const nextNodes = [...teamGroupNodes, ...finalNodes];
    const nextEdges = rawEdges.map(edge => ({
      ...edge,
      hidden: hiddenNodes.has(edge.source) || hiddenNodes.has(edge.target),
    }));

    // Batch update nodes and edges state
    setNodes(nextNodes);
    setEdges(nextEdges);
    setLayoutVersion(v => v + 1);

    // Viewport handling after manual toggle (pan to node)
    if (lastToggledRef.current) {
      const { id, oldPos } = lastToggledRef.current;
      const newNode = nextNodes.find(n => n.id === id);
      if (newNode) {
        const { x: vx, y: vy, zoom } = getViewport();
        const nextVx = vx + (oldPos.x - newNode.position.x) * zoom;
        const nextVy = vy + (oldPos.y - newNode.position.y) * zoom;
        setViewport({ x: nextVx, y: nextVy, zoom }, { duration: 400 });
      }
      lastToggledRef.current = null;
    }
  }, [rawNodes, rawEdges, searchQuery, collapsedNodes, expandedNodes, maxDepth, isRecruiterMode, leafColumns, getViewport, setViewport, leadershipLayers, nodeFilters, filterGroups, defaultFallbackColor]);

  useEffect(() => {
    if (layoutVersion > 0) {
      const duration = isFirstMount.current ? 0 : 400;
      const timer = setTimeout(() => {
        fitView({ duration, padding: 0.2 });
        isFirstMount.current = false;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [layoutVersion, fitView]);

  // Remove the old fitView effect

  // Sync / Auto-save logic
  useEffect(() => {
    if (!onDataChange || rawNodes.length === 0) return;

    const currentState = {
      nodes: rawNodes,
      edges: rawEdges,
      viewState: {
        maxDepth,
        leafColumns,
        collapsedNodes: Array.from(collapsedNodes),
        expandedNodes: Array.from(expandedNodes),
        leadershipLayers,
        nodeFilters,
        filterGroups,
        defaultFallbackColor,
        searchShortcut,
      }
    };

    const stateString = JSON.stringify(currentState);
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
  }, [rawNodes, rawEdges, maxDepth, leafColumns, collapsedNodes, expandedNodes, onDataChange, leadershipLayers, nodeFilters, filterGroups, defaultFallbackColor, searchShortcut]);

  const onEditNode = useCallback((id: string, data: any) => {
    setEditingNode({ id, data });
  }, []);
  const onToggleCollapse = useCallback((id: string) => {
    const node = getNode(id);
    if (node) {
      lastToggledRef.current = { id, oldPos: { ...node.position } };
    }

    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setExpandedNodes(e => new Set(e).add(id));
      } else {
        next.add(id);
        setExpandedNodes(e => {
          const nextE = new Set(e);
          nextE.delete(id);
          return nextE;
        });
      }
      return next;
    });
  }, [getNode]);

  const onAddSubordinate = useCallback((parentId: string) => {
    const newId = `empty-${Date.now()}`;
    const parentNode = rawNodes.find(n => n.id === parentId);
    
    const newNode: any = {
      id: newId,
      type: 'person',
      data: {
        firstName: '',
        lastName: '',
        jobTitle: 'New Position',
        team: parentNode?.data.team || '',
        workEmail: '',
        status: 'EMPTY',
        startDate: '',
        exitDate: '',
      },
      position: parentNode 
        ? { x: parentNode.position.x, y: parentNode.position.y + 200 }
        : { x: 0, y: 0 },
    };

    setRawNodes((nds) => nds.concat(newNode));
    setRawEdges((eds) => eds.concat({
      id: `e-${parentId}-${newId}`,
      source: parentId,
      target: newId,
    }));
  }, [rawNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    setRawNodes((nds) => nds.filter((node) => node.id !== id));
    setRawEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    setEditingNode(null);
  }, []);

  const handleSaveNode = useCallback((updatedData: any) => {
    if (!editingNode) return;
    const { managerId: newManagerId, ...restData } = updatedData;

    setRawNodes((nds) =>
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

    setRawEdges((eds) => {
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
  }, [editingNode]);

  const onConnect = useCallback((params: Connection) => setRawEdges((eds) => addEdge(params, eds)), []);
  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => setRawEdges((els) => updateEdge(oldEdge, newConnection, els)), []);

  const handleExport = useCallback(() => {
    const csv = exportToCsv(rawNodes as any, rawEdges as any);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'org_structure_modified.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [rawNodes, rawEdges]);

  const existingTeams = useMemo(() => {
    const teams = new Set<string>();
    rawNodes.forEach(node => {
      if (node.data.team) teams.add(node.data.team);
    });
    return Array.from(teams).sort();
  }, [rawNodes]);

  const existingJobTitles = useMemo(() => {
    const titles = new Set<string>();
    rawNodes.forEach(node => {
      if (node.data.jobTitle) titles.add(node.data.jobTitle);
    });
    return Array.from(titles).sort();
  }, [rawNodes]);

  const possibleManagers = useMemo(() => {
    return rawNodes
      .map(n => ({
        id: n.id,
        name: n.data.status === 'FILLED' 
          ? `${n.data.firstName} ${n.data.lastName}` 
          : `EMPTY: ${n.data.jobTitle} (${n.id})`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawNodes]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      console.log('Search triggered for:', searchQuery);
      const query = searchQuery.toLowerCase().trim();
      const queryParts = query.split(/\s+/).filter(p => p !== '');
      
      // Find all person nodes that match the search
      const matchingNodes = nodes.filter(node => {
        if (node.type !== 'person') return false;
        
        const firstName = node.data.firstName?.toLowerCase() || '';
        const lastName = node.data.lastName?.toLowerCase() || '';
        const jobTitle = node.data.jobTitle?.toLowerCase() || '';
        const team = node.data.team?.toLowerCase() || '';
        const statusText = node.data.status === 'EMPTY' ? 'empty' : '';

        return queryParts.every(part => 
          firstName.includes(part) || 
          lastName.includes(part) || 
          jobTitle.includes(part) || 
          team.includes(part) || 
          statusText.includes(part)
        );
      });

      console.log('Found matching nodes:', matchingNodes.length);

      if (matchingNodes.length > 0) {
        // Calculate the bounding box of all matching nodes
        const minX = Math.min(...matchingNodes.map(n => n.position.x));
        const minY = Math.min(...matchingNodes.map(n => n.position.y));
        const maxX = Math.max(...matchingNodes.map(n => n.position.x + (n.width || nodeWidth)));
        const maxY = Math.max(...matchingNodes.map(n => n.position.y + (n.height || nodeHeight)));

        console.log('Bounds:', { minX, minY, maxX, maxY });

        const padding = 50;
        const bounds = { 
          x: minX - padding, 
          y: minY - padding, 
          width: (maxX - minX) + padding * 2, 
          height: (maxY - minY) + padding * 2 
        };

        // If only one match, we don't want to zoom in TOO much
        if (matchingNodes.length === 1) {
          fitView({
            nodes: matchingNodes,
            duration: 800,
            padding: 2, // Larger padding to avoid max zoom
            maxZoom: 0.8
          });
        } else {
          fitBounds(bounds, { duration: 800 });
        }
      }
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner relative min-h-[500px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        minZoom={0.1}
      >
        <Panel position="top-left" className="bg-white p-2 rounded-lg shadow-md border border-slate-200 w-64">
          <div className="relative group/search">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, title, team..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
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
              const childIds = new Set(rawEdges.map(e => e.target));
              const directChildrenMap: Record<string, string[]> = {};
              rawEdges.forEach(edge => {
                if (!directChildrenMap[edge.source]) directChildrenMap[edge.source] = [];
                directChildrenMap[edge.source].push(edge.target);
              });
              let currentMax = 0;
              const findMaxDepth = (nodeId: string, depth: number) => {
                currentMax = Math.max(currentMax, depth);
                (directChildrenMap[nodeId] || []).forEach(childId => findMaxDepth(childId, depth + 1));
              };
              rawNodes.filter(n => !childIds.has(n.id)).forEach(root => findMaxDepth(root.id, 1));
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
          existingJobTitles={existingJobTitles}
          possibleManagers={possibleManagers}
          currentManagerId={rawEdges.find(e => e.target === editingNode.id)?.source || ''}
          onClose={() => setEditingNode(null)} 
          onSave={handleSaveNode} 
          onDelete={handleDeleteNode} 
        />
      )}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        leafColumns={leafColumns} 
        setLeafColumns={setLeafColumns} 
        leadershipLayers={leadershipLayers}
        setLeadershipLayers={setLeadershipLayers}
        nodeFilters={nodeFilters}
        setNodeFilters={setNodeFilters}
        filterGroups={filterGroups}
        setFilterGroups={setFilterGroups}
        defaultFallbackColor={defaultFallbackColor}
        setDefaultFallbackColor={setDefaultFallbackColor}
        searchShortcut={searchShortcut}
        setSearchShortcut={setSearchShortcut}
      />
    </div>
  );
};
export const OrgChart: React.FC<OrgChartProps> = (props) => (
  <ReactFlowProvider>
    <OrgChartInner {...props} />
  </ReactFlowProvider>
);
