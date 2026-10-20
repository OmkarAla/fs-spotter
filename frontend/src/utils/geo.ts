import type { RiskLevel, RouteDetail } from '../types/api';

export type LatLng = [number, number];

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

export const buildRiskSegments = (route: RouteDetail): RiskSegment[] => {
  const polyline = decodePolyline(route.polyline);
  const destination = polyline[polyline.length - 1];

  return route.checkpoints.map((checkpoint, index) => {
    const next = route.checkpoints[index + 1];
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
