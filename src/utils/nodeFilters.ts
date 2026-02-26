export interface NodeFilter {
  id: string;
  name: string;
  pattern: string;
  color: string;
}

export interface FilterGroup {
  id: string;
  name: string;
  enabled: boolean;
  filters: NodeFilter[];
}

export const getNodeColor = (
  jobTitle: string,
  filters: NodeFilter[],
  defaultColor: string = '#ffffff'
): string => {
  const normalizedTitle = jobTitle.toLowerCase();

  for (const filter of filters) {
    const patterns = filter.pattern
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    for (const pattern of patterns) {
      if (normalizedTitle.includes(pattern)) {
        return filter.color;
      }
    }
  }

  return defaultColor;
};

export const getActiveFilters = (
  scratchpadFilters: NodeFilter[],
  groups: FilterGroup[]
): NodeFilter[] => {
  return [
    ...scratchpadFilters,
    ...groups.filter(g => g.enabled).flatMap(g => g.filters)
  ];
};
