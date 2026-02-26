import { describe, it, expect } from 'vitest';
import { getNodeColor, NodeFilter } from './nodeFilters';

describe('nodeFilters', () => {
  const filters: NodeFilter[] = [
    { id: '1', name: 'Seniors', pattern: 'Senior', color: '#ff0000' },
    { id: '2', name: 'Managers', pattern: 'Manager', color: '#00ff00' },
    { id: '3', name: 'Principals', pattern: 'Principal, Staff', color: '#0000ff' },
  ];

  it('should return the color of the first matching filter', () => {
    expect(getNodeColor('Senior Software Engineer', filters)).toBe('#ff0000');
    expect(getNodeColor('Engineering Manager', filters)).toBe('#00ff00');
    expect(getNodeColor('Principal Architect', filters)).toBe('#0000ff');
    expect(getNodeColor('Staff Engineer', filters)).toBe('#0000ff');
  });

  it('should prioritize filters earlier in the list', () => {
    const overlappingFilters: NodeFilter[] = [
      { id: '1', name: 'Seniors', pattern: 'Senior', color: '#ff0000' },
      { id: '2', name: 'Senior Managers', pattern: 'Senior Manager', color: '#00ff00' },
    ];
    // "Senior Manager" matches both, but "Seniors" is first
    expect(getNodeColor('Senior Manager', overlappingFilters)).toBe('#ff0000');

    const reversedFilters = [...overlappingFilters].reverse();
    expect(getNodeColor('Senior Manager', reversedFilters)).toBe('#00ff00');
  });

  it('should return default color if no match', () => {
    expect(getNodeColor('Junior Engineer', filters)).toBe('#ffffff');
    expect(getNodeColor('Junior Engineer', filters, '#eeeeee')).toBe('#eeeeee');
  });

  it('should handle case-insensitivity', () => {
    expect(getNodeColor('senior engineer', filters)).toBe('#ff0000');
  });

  it('should handle comma-separated patterns', () => {
    expect(getNodeColor('Staff Engineer', filters)).toBe('#0000ff');
  });
});
