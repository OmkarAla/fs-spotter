import type { UnitSystem } from '../types/api';

const MILES_TO_KM = 1.60934;

export const formatDistance = (
  miles: number,
  unitSystem: UnitSystem,
): string => {
  if (unitSystem === 'metric') {
    return `${Math.round(miles * MILES_TO_KM).toLocaleString()} km`;
  }
  return `${Math.round(miles).toLocaleString()} mi`;
};

export const weightLabel = (unitSystem: UnitSystem): string =>
  unitSystem === 'metric' ? 'Load Weight (kg)' : 'Load Weight (lb)';

const INCHES_TO_MM = 25.4;

export const formatWind = (mph: number, unitSystem: UnitSystem): string =>
  unitSystem === 'metric'
    ? `${Math.round(mph * MILES_TO_KM)} km/h`
    : `${mph.toFixed(0)} mph`;

export const formatRain = (
  inchesPerHour: number,
  unitSystem: UnitSystem,
): string =>
  unitSystem === 'metric'
    ? `${(inchesPerHour * INCHES_TO_MM).toFixed(1)} mm/hr`
    : `${inchesPerHour.toFixed(2)} in/hr`;

export const formatSnow = (
  inchesPerHour: number,
  unitSystem: UnitSystem,
): string =>
  unitSystem === 'metric'
    ? `${(inchesPerHour * INCHES_TO_MM).toFixed(1)} mm/hr`
    : `${inchesPerHour.toFixed(1)} in/hr`;
