import { describe, it, expect } from 'vitest';
import { getLeadershipRank } from './leadershipLayers';
import type { LeadershipLayer } from './leadershipLayers';

describe('leadershipLayers utility', () => {
  const layers: LeadershipLayer[] = [
    { id: '1', name: 'Layer 1', identifier: 'Chapter Lead' },
    { id: '2', name: 'Layer 2', identifier: 'Engineering Manager' },
  ];

  it('assigns rank 0 to root nodes', () => {
    expect(getLeadershipRank('CEO', layers, true)).toBe(0);
    expect(getLeadershipRank('Chapter Lead', layers, true)).toBe(0);
  });

  it('assigns rank based on identifier matching', () => {
    expect(getLeadershipRank('Chapter Lead', layers, false)).toBe(1);
    expect(getLeadershipRank('Senior Chapter Lead', layers, false)).toBe(1);
    expect(getLeadershipRank('Engineering Manager', layers, false)).toBe(2);
    expect(getLeadershipRank('Assistant Engineering Manager', layers, false)).toBe(2);
  });

  it('assigns last rank to nodes that do not match any identifier', () => {
    expect(getLeadershipRank('Software Engineer', layers, false)).toBe(3);
    expect(getLeadershipRank('Product Manager', layers, false)).toBe(3);
  });

  it('is case insensitive', () => {
    expect(getLeadershipRank('chapter lead', layers, false)).toBe(1);
    expect(getLeadershipRank('ENGINEERING MANAGER', layers, false)).toBe(2);
  });

  it('handles multiple comma-separated identifiers', () => {
    const multiLayers: LeadershipLayer[] = [
      { id: '1', name: 'Leadership', identifier: 'Manager, Principal, Lead' }
    ];
    expect(getLeadershipRank('Engineering Manager', multiLayers, false)).toBe(1);
    expect(getLeadershipRank('Principal Engineer', multiLayers, false)).toBe(1);
    expect(getLeadershipRank('Team Lead', multiLayers, false)).toBe(1);
    expect(getLeadershipRank('Senior Developer', multiLayers, false)).toBe(2);
  });

  it('respects the order of layers', () => {
    const overlappingLayers: LeadershipLayer[] = [
      { id: '1', name: 'Manager', identifier: 'Manager' },
      { id: '2', name: 'Lead', identifier: 'Lead' },
    ];
    // "Engineering Manager Lead" matches both "Manager" and "Lead"
    // It should match "Manager" first because it comes first in the array.
    expect(getLeadershipRank('Engineering Manager Lead', overlappingLayers, false)).toBe(1);
  });
});
