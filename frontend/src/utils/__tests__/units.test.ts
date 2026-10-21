import { describe, expect, it } from 'vitest';
import {
  formatDistance,
  formatRain,
  formatSnow,
  formatWind,
  weightLabel,
} from '../units';

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

  it('formats wind, rain, and snow by unit system', () => {
    expect(formatWind(10, 'metric')).toBe('16 km/h');
    expect(formatWind(10, 'imperial')).toBe('10 mph');
    expect(formatRain(0.5, 'metric')).toBe('12.7 mm/hr');
    expect(formatRain(0.5, 'imperial')).toBe('0.50 in/hr');
    expect(formatSnow(0.5, 'metric')).toBe('12.7 mm/hr');
    expect(formatSnow(0.5, 'imperial')).toBe('0.5 in/hr');
  });
});
