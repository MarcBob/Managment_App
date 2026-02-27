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
  defaultFallbackColor?: string;
}

export const getNodeColor = (
  jobTitle: string,
  filters: NodeFilter[],
  defaultColor: string = '#ffffff',
  groupFallbackColor?: string
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

  return groupFallbackColor || defaultColor;
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

export interface FilterGroupStats {
  id: string;
  name: string;
  isActive: boolean;
  filters: (NodeFilter & { isActive: boolean })[];
}

export const getAllFiltersWithStatus = (
  scratchpadFilters: NodeFilter[],
  groups: FilterGroup[]
): FilterGroupStats[] => {
  const result: FilterGroupStats[] = [];

  // 1. Add scratchpad filters as a "Custom Filters" group if any exist
  if (scratchpadFilters.length > 0) {
    result.push({
      id: 'scratchpad',
      name: 'Custom Filters',
      isActive: true,
      filters: scratchpadFilters.map(f => ({ ...f, isActive: true }))
    });
  }

  // 2. Add each group in order
  groups.forEach(group => {
    result.push({
      id: group.id,
      name: group.name,
      isActive: group.enabled,
      filters: group.filters.map(f => ({ ...f, isActive: group.enabled }))
    });
  });

  return result;
};
