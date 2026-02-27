import type { OrgNode, OrgEdge } from './csvParser';
import type { FilterGroupStats } from './nodeFilters';

export interface FilterCount {
  id: string;
  name: string;
  pattern: string;
  count: number;
  color: string;
  isActive: boolean;
}

export interface GroupedFilterStats {
  id: string;
  name: string;
  isActive: boolean;
  filterCounts: FilterCount[];
  restCount: number;
}

export interface OrgStats {
  nodeCount: number;
  depth: number;
  minSpan: number;
  maxSpan: number;
  groupedFilterCounts: GroupedFilterStats[];
}

export function calculateOrgStats(
  nodes: OrgNode[],
  edges: OrgEdge[],
  filterGroups: FilterGroupStats[]
): OrgStats {
  if (nodes.length === 0) {
    return {
      nodeCount: 0,
      depth: 0,
      minSpan: 0,
      maxSpan: 0,
      groupedFilterCounts: [],
    };
  }

  // 1. Node count
  const nodeCount = nodes.length;

  // Build adjacency list (source -> targets)
  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  nodes.forEach(node => {
    adj[node.id] = [];
    inDegree[node.id] = 0;
  });

  edges.forEach(edge => {
    if (adj[edge.source] && adj[edge.target] !== undefined) {
      adj[edge.source].push(edge.target);
      inDegree[edge.target]++;
    }
  });

  // 2. Depth calculation (Longest path)
  // Use BFS starting from all roots (in-degree 0)
  const roots = nodes.filter(node => inDegree[node.id] === 0);
  
  let maxDepth = 0;
  const queue: { id: string; d: number }[] = roots.map(r => ({ id: r.id, d: 1 }));

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    maxDepth = Math.max(maxDepth, d);
    
    (adj[id] || []).forEach(childId => {
      queue.push({ id: childId, d: d + 1 });
    });
  }

  // 3. Leadership Span
  const spans = nodes
    .map(node => (adj[node.id] || []).length)
    .filter(span => span > 0);

  const minSpan = spans.length > 0 ? Math.min(...spans) : 0;
  const maxSpan = spans.length > 0 ? Math.max(...spans) : 0;

  // 4. Grouped Filter Counts
  const groupedFilterCounts: GroupedFilterStats[] = filterGroups.map(group => {
    // Keep track of which nodes matched *at least one* filter in this group
    const matchedNodeIds = new Set<string>();

    const filterCounts: FilterCount[] = group.filters.map(filter => {
      const patterns = filter.pattern
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);

      const matchingNodes = nodes.filter(node => {
        const normalizedTitle = node.data.jobTitle.toLowerCase();
        return patterns.some(pattern => normalizedTitle.includes(pattern));
      });

      matchingNodes.forEach(node => matchedNodeIds.add(node.id));

      return { 
        id: filter.id,
        name: filter.name, 
        pattern: filter.pattern,
        count: matchingNodes.length,
        color: filter.color,
        isActive: filter.isActive
      };
    });

    const restCount = nodes.length - matchedNodeIds.size;

    return {
      id: group.id,
      name: group.name,
      isActive: group.isActive,
      filterCounts,
      restCount
    };
  });

  return {
    nodeCount,
    depth: maxDepth,
    minSpan: minSpan,
    maxSpan: maxSpan,
    groupedFilterCounts,
  };
}
