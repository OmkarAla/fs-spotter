import { describe, expect, it } from 'vitest';
import type { RouteDetail } from '../../types/api';
import {
  buildRiskSegments,
  dangerousMiles,
  decodePolyline,
  formatDuration,
  riskColor,
  severeMiles,
} from '../geo';

describe('decodePolyline', () => {
  it('decodes the reference Google polyline', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });
});

describe('formatDuration', () => {
  it('formats seconds as hours and minutes', () => {
    expect(formatDuration(36000)).toBe('10h 0m');
    expect(formatDuration(3720)).toBe('1h 2m');
  });
});

describe('riskColor', () => {
  it('maps each risk level to a distinct logistics color', () => {
    expect(riskColor('Low')).toBe('#10B981');
    expect(riskColor('Moderate')).toBe('#F59E0B');
    expect(riskColor('High')).toBe('#EF4444');
    expect(riskColor('Severe')).toBe('#B91C1C');
    expect(riskColor('No Travel')).toBe('#7F1D1D');
  });
});

describe('dangerousMiles', () => {
  it('counts no-travel miles alongside high and severe miles', () => {
    expect(
      dangerousMiles({ Low: 500, High: 225, Severe: 125, 'No Travel': 50 }),
    ).toBe(400);
  });

  it('returns zero when no dangerous risk miles are present', () => {
    expect(dangerousMiles({ Low: 500, Moderate: 100 })).toBe(0);
  });
});

describe('severeMiles', () => {
  it('counts no-travel miles alongside severe miles', () => {
    expect(severeMiles({ High: 200, Severe: 125, 'No Travel': 50 })).toBe(175);
  });
});

describe('buildRiskSegments', () => {
  it('colors each checkpoint span and extends the last span to the destination', () => {
    const route: RouteDetail = {
      route_id: 'route-1',
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      total_distance: 200,
      total_time: 36000,
      risk_miles: { Low: 100, High: 100 },
      total_risk_score: 200,
      checkpoints: [
        {
          latitude: 38.5,
          longitude: -120.2,
          estimated_arrival: '2026-10-20T08:00:00Z',
          weather_data: { wind: 10, rain: 0, snow: 0 },
          risk_level: 'Low',
          mile_marker: 0,
        },
        {
          latitude: 40.7,
          longitude: -120.95,
          estimated_arrival: '2026-10-20T09:00:00Z',
          weather_data: { wind: 40, rain: 0, snow: 0 },
          risk_level: 'High',
          mile_marker: 100,
        },
      ],
    };

    expect(buildRiskSegments(route)).toEqual([
      { positions: [[38.5, -120.2], [40.7, -120.95]], risk: 'Low' },
      { positions: [[40.7, -120.95], [43.252, -126.453]], risk: 'High' },
    ]);
  });
});
