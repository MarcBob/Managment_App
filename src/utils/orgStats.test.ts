import { describe, it, expect } from 'vitest';
import type { OrgNode, OrgEdge } from './csvParser';
import type { FilterGroupStats } from './nodeFilters';
import { calculateOrgStats } from './orgStats';

describe('calculateOrgStats', () => {
  const nodes: OrgNode[] = [
    { id: '1', type: 'person', data: { firstName: 'CEO', lastName: 'One', jobTitle: 'CEO', team: 'Exec', workEmail: '1', supervisorName: '', status: 'FILLED' }, position: { x: 0, y: 0 } },
    { id: '2', type: 'person', data: { firstName: 'VP', lastName: 'One', jobTitle: 'VP Engineering', team: 'Eng', workEmail: '2', supervisorName: 'One, CEO', status: 'FILLED' }, position: { x: 0, y: 0 } },
    { id: '3', type: 'person', data: { firstName: 'VP', lastName: 'Two', jobTitle: 'VP Product', team: 'Prod', workEmail: '3', supervisorName: 'One, CEO', status: 'FILLED' }, position: { x: 0, y: 0 } },
    { id: '4', type: 'person', data: { firstName: 'Eng', lastName: 'One', jobTitle: 'Senior Engineer', team: 'Eng', workEmail: '4', supervisorName: 'One, VP', status: 'FILLED' }, position: { x: 0, y: 0 } },
    { id: '5', type: 'person', data: { firstName: 'Eng', lastName: 'Two', jobTitle: 'Engineer', team: 'Eng', workEmail: '5', supervisorName: 'One, VP', status: 'FILLED' }, position: { x: 0, y: 0 } },
    { id: '6', type: 'person', data: { firstName: 'Prod', lastName: 'One', jobTitle: 'Product Manager', team: 'Prod', workEmail: '6', supervisorName: 'Two, VP', status: 'FILLED' }, position: { x: 0, y: 0 } },
  ];

  const edges: OrgEdge[] = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e1-3', source: '1', target: '3' },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e2-5', source: '2', target: '5' },
    { id: 'e3-6', source: '3', target: '6' },
  ];

  const filterGroups: FilterGroupStats[] = [
    {
      id: 'scratchpad',
      name: 'Custom Filters',
      isActive: true,
      filters: [
        { id: 'f1', name: 'Senior', pattern: 'Senior', color: 'red', isActive: true },
      ]
    },
    {
      id: 'g1',
      name: 'Management',
      isActive: false,
      filters: [
        { id: 'f2', name: 'VP', pattern: 'VP', color: 'blue', isActive: false },
      ]
    }
  ];

  it('calculates the number of positions', () => {
    const stats = calculateOrgStats(nodes, edges, filterGroups);
    expect(stats.nodeCount).toBe(6);
  });

  it('calculates the depth of the organization', () => {
    const stats = calculateOrgStats(nodes, edges, filterGroups);
    // Path: 1 -> 2 -> 4 (depth 3)
    expect(stats.depth).toBe(3);
  });

  it('calculates counts for color filters and rest count within groups', () => {
    const stats = calculateOrgStats(nodes, edges, filterGroups);
    expect(stats.groupedFilterCounts).toHaveLength(2);
    
    // Group 1: Custom Filters (Senior: 1)
    expect(stats.groupedFilterCounts[0].name).toBe('Custom Filters');
    expect(stats.groupedFilterCounts[0].filterCounts[0].count).toBe(1);
    expect(stats.groupedFilterCounts[0].restCount).toBe(5); // 6 total - 1 matched

    // Group 2: Management (VP: 2)
    expect(stats.groupedFilterCounts[1].name).toBe('Management');
    expect(stats.groupedFilterCounts[1].filterCounts[0].count).toBe(2);
    expect(stats.groupedFilterCounts[1].restCount).toBe(4); // 6 total - 2 matched
  });

  it('handles empty organization', () => {
    const stats = calculateOrgStats([], [], []);
    expect(stats.nodeCount).toBe(0);
    expect(stats.depth).toBe(0);
    expect(stats.groupedFilterCounts).toEqual([]);
  });
});
