import React from 'react';
import { useRouteStore } from '../store/routeStore';

export const WeatherSlider: React.FC = () => {
  const forecastTime = useRouteStore((state) => state.forecastTime);
  const setForecastTime = useRouteStore((state) => state.setForecastTime);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label
            htmlFor="forecast-horizon"
            className="text-sm font-semibold text-[#F8FAFC]"
          >
            Forecast Horizon
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Scan the trip corridor up to 48 hours ahead.
          </p>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-300">
          +{forecastTime}h
        </span>
      </div>

      <input
        id="forecast-horizon"
        aria-label="Forecast horizon"
        type="range"
        min="0"
        max="48"
        step="1"
        value={forecastTime}
        onChange={(event) => setForecastTime(Number(event.target.value))}
        className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 accent-amber-500"
      />

      <div className="mt-2 flex justify-between text-[11px] font-medium uppercase tracking-wider text-slate-500">
        <span>Now</span>
        <span>+24h</span>
        <span>+48h</span>
      </div>
    </section>
  );
};
