import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateInTimeZone,
  monthMatrix,
  timeInTimeZone,
  timeZoneLabel,
} from '../datetime';

describe('datetime helpers', () => {
  const instant = new Date('2026-10-21T02:30:00Z');

  it('formats dates and times in the requested timezone', () => {
    expect(dateInTimeZone('America/Los_Angeles', instant)).toBe('2026-10-20');
    expect(timeInTimeZone('America/Los_Angeles', instant)).toBe('19:30');
    expect(timeInTimeZone('Europe/Berlin', instant)).toBe('04:30');
  });

  it('labels the timezone abbreviation', () => {
    expect(timeZoneLabel('America/New_York', instant)).toMatch(/EDT|GMT-4/);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('builds a padded month matrix', () => {
    const cells = monthMatrix(2026, 9);

    expect(cells.length % 7).toBe(0);
    expect(cells).toContain('2026-10-01');
    expect(cells).toContain('2026-10-31');
    expect(cells.filter(Boolean)).toHaveLength(31);
  });
});
