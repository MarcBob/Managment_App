export interface SalarySubBand {
  name: 'Learning' | 'Fulfilling' | 'Mastering' | 'Exceeding';
  start: number;
  end: number;
}

export interface SalaryBand {
  id: string;
  name: string;
  midpoint: number;
  spread: number; // e.g., 0.075 for 7.5%
  isAutoCalculated: boolean;
  parentId?: string; // For progression tracking
  isLeading?: boolean;
}

export interface JobFamily {
  id: string;
  name: string;
  salaryBands: SalaryBand[];
}

export const SUB_BAND_NAMES: SalarySubBand['name'][] = ['Learning', 'Fulfilling', 'Mastering', 'Exceeding'];

export function calculateSubBands(midpoint: number, spread: number): SalarySubBand[] {
  return [
    {
      name: 'Learning',
      start: midpoint * (1 - 2 * spread),
      end: midpoint * (1 - spread),
    },
    {
      name: 'Fulfilling',
      start: midpoint * (1 - spread),
      end: midpoint,
    },
    {
      name: 'Mastering',
      start: midpoint,
      end: midpoint * (1 + spread),
    },
    {
      name: 'Exceeding',
      start: midpoint * (1 + spread),
      end: midpoint * (1 + 2 * spread),
    },
  ];
}

export function calculateNextMidpoint(currentMidpoint: number, spread: number): number {
  // Learning Start (N+1) = Exceeding Start (N)
  // Midpoint_{N+1} * (1 - 2 * spread) = Midpoint_N * (1 + spread)
  // Midpoint_{N+1} = Midpoint_N * (1 + spread) / (1 - 2 * spread)
  return (currentMidpoint * (1 + spread)) / (1 - 2 * spread);
}

export function calculatePreviousMidpoint(currentMidpoint: number, spread: number): number {
  // Midpoint_N = Midpoint_{N+1} * (1 - 2 * spread) / (1 + spread)
  return (currentMidpoint * (1 - 2 * spread)) / (1 + spread);
}
