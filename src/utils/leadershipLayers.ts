export interface LeadershipLayer {
  id: string;
  name: string;
  identifier: string; // Now supports comma-separated terms like "Engineering Manager, Principal"
}

export const getLeadershipRank = (
  jobTitle: string,
  layers: LeadershipLayer[],
  isRoot: boolean
): number => {
  if (isRoot) return 0;

  const normalizedTitle = jobTitle.toLowerCase();

  for (let i = 0; i < layers.length; i++) {
    const identifiers = layers[i].identifier
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    for (const term of identifiers) {
      if (normalizedTitle.includes(term)) {
        return i + 1;
      }
    }
  }

  return layers.length + 1;
};
