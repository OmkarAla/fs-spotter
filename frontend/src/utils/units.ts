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
