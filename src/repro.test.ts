import { describe, it, expect } from 'vitest';
import { parseOrgCsv } from './utils/csvParser';

describe('Reproduction of disappearing nodes', () => {
  it('should maintain empty nodes in JSON state', () => {
    const initialCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status
John,Doe,CEO,,john@example.com,,FILLED`;
    
    // Simulate initial load from CSV
    const { nodes: initialNodes, edges: initialEdges } = parseOrgCsv(initialCsv);
    expect(initialNodes).toHaveLength(1);

    // Simulate adding an empty node via UI
    const parentId = 'john@example.com';
    const newId = 'empty-123456';
    const newNode = {
      id: newId,
      type: 'person',
      data: {
        firstName: '',
        lastName: '',
        jobTitle: 'New Position',
        team: 'Engineering',
        status: 'EMPTY',
      },
      position: { x: 0, y: 200 },
    };
    
    const nodesAfterAdd = [...initialNodes, newNode];
    const edgesAfterAdd = [...initialEdges, {
      id: `e-${parentId}-${newId}`,
      source: parentId,
      target: newId,
    }];

    expect(nodesAfterAdd).toHaveLength(2);
    expect(edgesAfterAdd).toHaveLength(1);

    // Simulate saving to JSON
    const jsonState = JSON.stringify({
      nodes: nodesAfterAdd,
      edges: edgesAfterAdd,
    });

    // Simulate reloading from JSON
    const loadedState = JSON.parse(jsonState);
    expect(loadedState.nodes).toHaveLength(2);
    expect(loadedState.edges).toHaveLength(1);

    const emptyNode = loadedState.nodes.find((n: any) => n.id === newId);
    expect(emptyNode).toBeDefined();
    expect(emptyNode.data.status).toBe('EMPTY');
  });
});
