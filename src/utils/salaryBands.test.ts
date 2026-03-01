import { describe, it, expect } from 'vitest';
import { calculateSubBands, calculateNextMidpoint } from './salaryBands';

describe('salaryBands utility', () => {
  describe('calculateSubBands', () => {
    it('should calculate sub-bands correctly for 100 midpoint and 7.5% spread', () => {
      const midpoint = 100;
      const spread = 0.075;
      const subBands = calculateSubBands(midpoint, spread);

      expect(subBands).toHaveLength(4);
      
      expect(subBands[0].name).toBe('Learning');
      expect(subBands[0].start).toBeCloseTo(85);
      expect(subBands[0].end).toBeCloseTo(92.5);

      expect(subBands[1].name).toBe('Fulfilling');
      expect(subBands[1].start).toBeCloseTo(92.5);
      expect(subBands[1].end).toBeCloseTo(100);

      expect(subBands[2].name).toBe('Mastering');
      expect(subBands[2].start).toBeCloseTo(100);
      expect(subBands[2].end).toBeCloseTo(107.5);

      expect(subBands[3].name).toBe('Exceeding');
      expect(subBands[3].start).toBeCloseTo(107.5);
      expect(subBands[3].end).toBeCloseTo(115);
    });
  });

  describe('calculateNextMidpoint', () => {
    it('should calculate next midpoint correctly so that Learning Start (N+1) equals Exceeding Start (N)', () => {
      const midpointN = 100;
      const spread = 0.075;
      const midpointNplus1 = calculateNextMidpoint(midpointN, spread);

      // Exceeding Start (N) = 100 * (1 + 0.075) = 107.5
      // Learning Start (N+1) = midpointNplus1 * (1 - 2 * 0.075) = midpointNplus1 * 0.85
      const exceedingStartN = midpointN * (1 + spread);
      const learningStartNplus1 = midpointNplus1 * (1 - 2 * spread);

      expect(learningStartNplus1).toBeCloseTo(exceedingStartN);
      expect(midpointNplus1).toBeCloseTo(126.470588, 5);
    });
  });
});
