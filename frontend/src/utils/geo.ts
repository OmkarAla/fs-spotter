import type { Checkpoint, RiskLevel, RouteDetail } from '../types/api';

export type LatLng = [number, number];
export type HeatPoint = [number, number, number];
export type RiskPoint = Pick<
  Checkpoint,
  'latitude' | 'longitude' | 'risk_level'
>;

export interface RiskSegment {
  positions: LatLng[];
  risk: RiskLevel;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: '#10B981',
  Moderate: '#F59E0B',
  High: '#EF4444',
  Severe: '#B91C1C',
  'No Travel': '#7F1D1D',
};

const RISK_INTENSITY: Record<RiskLevel, number> = {
  Low: 0.08,
  Moderate: 0.38,
  High: 0.62,
  Severe: 0.85,
  'No Travel': 1,
};

export const riskColor = (risk: RiskLevel): string => RISK_COLORS[risk];

export const dangerousMiles = (
  riskMiles: Partial<Record<RiskLevel, number>>,
): number =>
  (riskMiles.High ?? 0) +
  (riskMiles.Severe ?? 0) +
  (riskMiles['No Travel'] ?? 0);

export const severeMiles = (
  riskMiles: Partial<Record<RiskLevel, number>>,
): number => (riskMiles.Severe ?? 0) + (riskMiles['No Travel'] ?? 0);

export const decodePolyline = (encoded: string): LatLng[] => {
  const points: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const latitudeResult = decodeValue(encoded, index);
    const longitudeResult = decodeValue(encoded, latitudeResult.index);

    latitude += latitudeResult.value;
    longitude += longitudeResult.value;
    index = longitudeResult.index;
    points.push([latitude / 1e5, longitude / 1e5]);
  }

  return points;
};

export const formatDuration = (seconds: number): string => {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const formatDistance = (miles: number): string =>
  `${Math.round(miles).toLocaleString('en-US')} mi`;

export const buildRiskSegments = (
  route: RouteDetail,
  checkpoints: RiskPoint[] = route.checkpoints,
): RiskSegment[] => {
  const polyline = decodePolyline(route.polyline);
  const destination = polyline[polyline.length - 1];

  return checkpoints.map((checkpoint, index) => {
    const next = checkpoints[index + 1];
    return {
      positions: [
        [checkpoint.latitude, checkpoint.longitude],
        next
          ? [next.latitude, next.longitude]
          : destination ?? [checkpoint.latitude, checkpoint.longitude],
      ],
      risk: checkpoint.risk_level,
    };
  });
};

const decodeValue = (
  encoded: string,
  startIndex: number,
): { value: number; index: number } => {
  let result = 0;
  let shift = 0;
  let index = startIndex;

  while (index < encoded.length) {
    const value = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (value & 0x1f) << shift;
    shift += 5;

    if (value < 0x20) {
      break;
    }
  }

  return {
    value: result & 1 ? ~(result >> 1) : result >> 1,
    index,
  };
};


export const buildCorridorHeatPoints = (
  checkpoints: RiskPoint[],
  subdivisions = 6,
): HeatPoint[] => {
  if (checkpoints.length === 0) return [];
  if (checkpoints.length === 1) {
    const point = checkpoints[0];
    return [
      [point.latitude, point.longitude, RISK_INTENSITY[point.risk_level]],
    ];
  }

  const steps = Math.max(1, Math.floor(subdivisions));
  const points: HeatPoint[] = [];

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const start = checkpoints[index];
    const end = checkpoints[index + 1];
    const startIntensity = RISK_INTENSITY[start.risk_level];
    const endIntensity = RISK_INTENSITY[end.risk_level];

    for (let step = 0; step < steps; step += 1) {
      const fraction = step / steps;
      points.push([
        start.latitude + (end.latitude - start.latitude) * fraction,
        start.longitude + (end.longitude - start.longitude) * fraction,
        startIntensity + (endIntensity - startIntensity) * fraction,
      ]);
    }
  }

  const last = checkpoints[checkpoints.length - 1];
  points.push([
    last.latitude,
    last.longitude,
    RISK_INTENSITY[last.risk_level],
  ]);

  return points;
};
