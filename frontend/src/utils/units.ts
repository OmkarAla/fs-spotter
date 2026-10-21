import type { UnitSystem } from '../types/api';

const KM_PER_MILE = 1.609344;
const LB_PER_KG = 2.2046226218;
const MM_PER_INCH = 25.4;

export const defaultUnitForCountry = (countryCode: string): UnitSystem =>
  countryCode.toUpperCase() === 'USA' ? 'imperial' : 'metric';

export const formatDistance = (
  miles: number,
  unitSystem: UnitSystem = 'imperial',
): string =>
  unitSystem === 'imperial'
    ? `${Math.round(miles).toLocaleString('en-US')} mi`
    : `${Math.round(miles * KM_PER_MILE).toLocaleString('en-US')} km`;

export const weightLabel = (unitSystem: UnitSystem): string =>
  unitSystem === 'metric' ? 'Load Weight (kg)' : 'Load Weight (lb)';

export const formatWeight = (pounds: number, unitSystem: UnitSystem): string =>
  unitSystem === 'imperial'
    ? `${Math.round(pounds).toLocaleString('en-US')} lb`
    : `${Math.round(pounds / LB_PER_KG).toLocaleString('en-US')} kg`;

export const formatWind = (mph: number, unitSystem: UnitSystem): string =>
  unitSystem === 'metric'
    ? `${Math.round(mph * KM_PER_MILE)} km/h`
    : `${Math.round(mph)} mph`;

export const formatRain = (
  inchesPerHour: number,
  unitSystem: UnitSystem,
): string =>
  unitSystem === 'metric'
    ? `${(inchesPerHour * MM_PER_INCH).toFixed(1)} mm/hr`
    : `${inchesPerHour.toFixed(2)} in/hr`;

export const formatSnow = (
  inchesPerHour: number,
  unitSystem: UnitSystem,
): string =>
  unitSystem === 'metric'
    ? `${(inchesPerHour * 2.54).toFixed(1)} cm/hr`
    : `${inchesPerHour.toFixed(1)} in/hr`;

export const convertWeight = (
  value: number,
  from: 'lb' | 'kg',
  to: 'lb' | 'kg',
): number => {
  if (from === to) return value;
  return from === 'lb' ? value / LB_PER_KG : value * LB_PER_KG;
};
