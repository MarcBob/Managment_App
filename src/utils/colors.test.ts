import { describe, it, expect } from 'vitest';
import { getContrastColor } from './colors';

describe('getContrastColor', () => {
  it('should return white for dark colors', () => {
    expect(getContrastColor('#000000')).toBe('white');
    expect(getContrastColor('#1a1a1a')).toBe('white');
    expect(getContrastColor('#0000ff')).toBe('white'); // Blue
    expect(getContrastColor('#800000')).toBe('white'); // Maroon
  });

  it('should return black for light colors', () => {
    expect(getContrastColor('#ffffff')).toBe('black');
    expect(getContrastColor('#f0f0f0')).toBe('black');
    expect(getContrastColor('#ffff00')).toBe('black'); // Yellow
    expect(getContrastColor('#00ff00')).toBe('black'); // Lime
  });

  it('should handle hex colors without hash', () => {
    expect(getContrastColor('000000')).toBe('white');
    expect(getContrastColor('ffffff')).toBe('black');
  });

  it('should handle shorthand hex colors', () => {
    expect(getContrastColor('#000')).toBe('white');
    expect(getContrastColor('#fff')).toBe('black');
  });
});
