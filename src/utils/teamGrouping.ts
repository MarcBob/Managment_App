export interface TeamGroup {
  id: string;
  team: string;
  memberIds: string[];
}

export function getTeamGroups(nodes: any[], edges: any[]): TeamGroup[] {
  const directChildrenMap: Record<string, string[]> = {};
  edges.forEach(edge => {
    if (!directChildrenMap[edge.source]) directChildrenMap[edge.source] = [];
    directChildrenMap[edge.source].push(edge.target);
  });

  const nodeMap: Record<string, any> = {};
  nodes.forEach(node => {
    nodeMap[node.id] = node;
  });

  const groups: TeamGroup[] = [];

  Object.entries(directChildrenMap).forEach(([parentId, childrenIds]) => {
    const teamsInGroup: Record<string, string[]> = {};
    
    childrenIds.forEach(childId => {
      const node = nodeMap[childId];
      if (node && node.data && node.data.team) {
        const team = node.data.team;
        if (!teamsInGroup[team]) teamsInGroup[team] = [];
        teamsInGroup[team].push(childId);
      }
    });

    Object.entries(teamsInGroup).forEach(([team, memberIds]) => {
      const parentNode = nodeMap[parentId];
      const finalMemberIds = [...memberIds];
      
      // If parent belongs to the same team, include them in the frame
      if (parentNode && parentNode.data && parentNode.data.team === team) {
        finalMemberIds.push(parentId);
      }

      if (finalMemberIds.length > 1) {
        groups.push({
          id: `team-group-${parentId}-${team}`,
          team,
          memberIds: finalMemberIds
        });
      }
    });
  });

  return groups;
}

export interface TeamGroupPosition {
  id: string;
  team: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateTeamGroupPositions(
  groups: TeamGroup[],
  layoutedNodes: any[],
  nodeWidth: number,
  nodeHeight: number,
  padding: number
): TeamGroupPosition[] {
  return groups.map(group => {
    const groupMembers = group.memberIds
      .map(id => layoutedNodes.find(n => n.id === id))
      .filter((n): n is any => !!n && !n.hidden);
    
    if (groupMembers.length < 1) return null;

    const minX = Math.min(...groupMembers.map(n => n.position.x));
    const minY = Math.min(...groupMembers.map(n => n.position.y));
    const maxX = Math.max(...groupMembers.map(n => n.position.x + nodeWidth));
    const maxY = Math.max(...groupMembers.map(n => n.position.y + nodeHeight));

    return {
      id: group.id,
      team: group.team,
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2),
    };
  }).filter((p): p is TeamGroupPosition => p !== null);
}
