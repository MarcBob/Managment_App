export interface NodeFilter {
  id: string;
  name: string;
  pattern: string;
  color: string;
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
