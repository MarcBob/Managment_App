import { describe, it, expect } from 'vitest';
import { getTeamGroups, calculateTeamGroupPositions } from './teamGrouping';

describe('getTeamGroups', () => {
  // ... existing tests ...
  it('should identify teams with multiple members under the same lead', () => {
    const nodes = [
      { id: '1', data: { team: 'Engineering' }, position: { x: 100, y: 100 } },
      { id: '2', data: { team: 'Engineering' }, position: { x: 200, y: 100 } },
      { id: '3', data: { team: 'Product' }, position: { x: 300, y: 100 } },
      { id: '4', data: { team: 'Product' }, position: { x: 400, y: 100 } },
    ];
    const edges = [
      { source: 'lead1', target: '1' },
      { source: 'lead1', target: '2' },
      { source: 'lead1', target: '3' },
      { source: 'lead1', target: '4' },
    ];

    const groups = getTeamGroups(nodes as any, edges as any);

    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.team === 'Engineering')).toBeDefined();
    expect(groups.find(g => g.team === 'Product')).toBeDefined();
  });

  it('should not group single members', () => {
    const nodes = [
      { id: '1', data: { team: 'Engineering' }, position: { x: 100, y: 100 } },
      { id: '2', data: { team: 'Product' }, position: { x: 200, y: 100 } },
    ];
    const edges = [
      { source: 'lead1', target: '1' },
      { source: 'lead1', target: '2' },
    ];

    const groups = getTeamGroups(nodes as any, edges as any);

    expect(groups).toHaveLength(0);
  });
});

describe('calculateTeamGroupPositions', () => {
  it('should calculate correct bounding boxes with padding', () => {
    const groups = [
      { id: 'group1', team: 'Engineering', memberIds: ['1', '2'] }
    ];
    const nodes = [
      { id: '1', position: { x: 100, y: 100 } },
      { id: '2', position: { x: 200, y: 150 } },
    ];
    const nodeWidth = 50;
    const nodeHeight = 30;
    const padding = 10;

    const positions = calculateTeamGroupPositions(groups, nodes, nodeWidth, nodeHeight, padding);

    expect(positions).toHaveLength(1);
    const pos = positions[0];
    expect(pos.x).toBe(100 - padding);
    expect(pos.y).toBe(100 - padding);
    // maxX = 200 + 50 = 250. width = 250 - 100 + 2*10 = 170
    expect(pos.width).toBe(150 + 2 * padding);
    // maxY = 150 + 30 = 180. height = 180 - 100 + 2*10 = 100
    expect(pos.height).toBe(80 + 2 * padding);
  });

  it('should return a group if 1 member is found', () => {
    const groups = [
      { id: 'group1', team: 'Engineering', memberIds: ['1', '2'] }
    ];
    const nodes = [
      { id: '1', position: { x: 100, y: 100 } },
      // node 2 is missing
    ];
    const positions = calculateTeamGroupPositions(groups, nodes, 50, 30, 10);
    expect(positions).toHaveLength(1);
  });

  it('should return empty if 0 members are found', () => {
    const groups = [
      { id: 'group1', team: 'Engineering', memberIds: ['1', '2'] }
    ];
    const nodes = [
      // all nodes missing
    ];
    const positions = calculateTeamGroupPositions(groups, nodes, 50, 30, 10);
    expect(positions).toHaveLength(0);
  });
});
