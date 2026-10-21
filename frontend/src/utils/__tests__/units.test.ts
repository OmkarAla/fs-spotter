import { describe, expect, it } from 'vitest';
import { formatDistance, weightLabel } from '../units';

describe('unit helpers', () => {
  it('formats miles in imperial units', () => {
    expect(formatDistance(120.4, 'imperial')).toBe('120 mi');
  });

  it('converts miles to kilometres for metric units', () => {
    expect(formatDistance(3.10686, 'metric')).toBe('5 km');
  });

  it('labels the load weight field by unit system', () => {
    expect(weightLabel('imperial')).toBe('Load Weight (lb)');
    expect(weightLabel('metric')).toBe('Load Weight (kg)');
  });
});
