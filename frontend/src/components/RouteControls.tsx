import React, { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import { useRouteStore } from '../store/routeStore';
import type { GeocodeResult, UnitSystem } from '../types/api';
import {
  convertWeight,
  defaultUnitForCountry,
  weightLabel,
} from '../utils/units';
import { DeparturePicker } from './DeparturePicker';
import { LocationCombobox } from './LocationCombobox';
import { UnitToggle } from './UnitToggle';

export const RouteControls: React.FC = () => {
  const setJob = useRouteStore((state) => state.setJob);
  const setJobError = useRouteStore((state) => state.setJobError);
  const unitSystem = useRouteStore((state) => state.unitSystem);
  const setUnitSystem = useRouteStore((state) => state.setUnitSystem);

  const [origin, setOrigin] = useState<GeocodeResult | null>(null);
  const [destination, setDestination] = useState<GeocodeResult | null>(null);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [loadWeight, setLoadWeight] = useState('');
  const [unitTouched, setUnitTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originTimeZone = origin?.timezone ?? null;
  const ready =
    Boolean(origin && destination && departureDate && departureTime) &&
    Number(loadWeight) > 0;

  const convertWeightInput = (nextUnit: UnitSystem) => {
    if (nextUnit === unitSystem || loadWeight.trim() === '') return;
    const value = Number(loadWeight);
    if (!Number.isFinite(value)) return;
    const converted = convertWeight(
      value,
      unitSystem === 'metric' ? 'kg' : 'lb',
      nextUnit === 'metric' ? 'kg' : 'lb',
    );
    setLoadWeight(String(Number(converted.toFixed(2))));
  };

  const handleUnitChange = (nextUnit: UnitSystem) => {
    setUnitTouched(true);
    convertWeightInput(nextUnit);
    setUnitSystem(nextUnit);
  };

  const handleOriginChange = (next: GeocodeResult | null) => {
    if (next?.timezone !== origin?.timezone) {
      setDepartureDate('');
      setDepartureTime('');
    }
    if (next && !unitTouched) {
      const nextUnit = defaultUnitForCountry(next.country_code);
      if (nextUnit !== unitSystem) {
        convertWeightInput(nextUnit);
        setUnitSystem(nextUnit);
      }
    }
    setOrigin(next);
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setDepartureDate('');
    setDepartureTime('');
  };

  const handleDepartureChange = useCallback((date: string, time: string) => {
    setDepartureDate(date);
    setDepartureTime(time);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!origin || !destination || !departureDate || !departureTime) return;

    setLoading(true);
    setError(null);
    setJobError(null);
    try {
      const job = await apiClient.triggerRoute({
        origin,
        destination,
        departure_date: departureDate,
        departure_time: departureTime,
        load_weight: Number(loadWeight),
        load_weight_unit: unitSystem === 'metric' ? 'kg' : 'lb',
        unit_system: unitSystem,
      });
      setJob(job.id);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not start routing. Please check your inputs and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-[#0F172A] p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#F8FAFC]">Plan a route</h2>
        <UnitToggle value={unitSystem} onChange={handleUnitChange} />
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="md:col-span-1">
          <LocationCombobox
            id="origin"
            label="Origin"
            value={origin}
            onChange={handleOriginChange}
            placeholder="City, address, or landmark"
          />
        </div>
        <div className="md:col-span-1">
          <LocationCombobox
            id="destination"
            label="Destination"
            value={destination}
            onChange={setDestination}
            placeholder="City, address, or landmark"
          />
          <button
            type="button"
            onClick={handleSwap}
            disabled={!origin && !destination}
            className="mt-1 self-start text-xs font-medium text-slate-400 transition-colors hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Swap origin and destination
          </button>
        </div>

        <div className="md:col-span-1">
          <DeparturePicker
            timeZone={originTimeZone}
            date={departureDate}
            time={departureTime}
            onChange={handleDepartureChange}
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-1">
          <label htmlFor="loadWeight" className="text-sm font-medium text-[#F8FAFC]">
            {weightLabel(unitSystem)}
          </label>
          <input
            id="loadWeight"
            type="number"
            min="0.1"
            step="any"
            value={loadWeight}
            onChange={(event) => setLoadWeight(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 p-2 text-[#F8FAFC] outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-amber-500"
            placeholder={unitSystem === 'metric' ? '20000' : '45000'}
            required
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-500 bg-red-900/20 p-3 text-sm text-red-200 md:col-span-2">
            {error}
          </div>
        )}

        <div className="mt-2 md:col-span-2">
          <button
            type="submit"
            disabled={!ready || loading}
            className="w-full rounded-md bg-[#F59E0B] px-6 py-3 font-bold uppercase tracking-wider text-[#0F172A] transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Find Safest Route'}
          </button>
        </div>
      </form>
    </div>
  );
};
