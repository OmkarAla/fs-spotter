import React from 'react';
import { useRouteStore } from '../store/routeStore';
import type { RouteResult } from '../types/api';
import { dangerousMiles, formatDuration, severeMiles } from '../utils/geo';
import { formatDistance } from '../utils/units';

interface RouteComparisonProps {
  result: RouteResult | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

export const RouteComparison: React.FC<RouteComparisonProps> = ({
  result,
  selectedRouteId,
  onSelectRoute,
}) => {
  const unitSystem = useRouteStore((state) => state.unitSystem);

  if (!result) return null;

  return (
    <section
      aria-label="Route comparison"
      className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]"
    >
      {result.routes.map((route, index) => {
        const isRecommended = route.route_id === result.recommended_route_id;
        const isSelected = route.route_id === selectedRouteId;

        return (
          <div
            key={route.route_id}
            role="button"
            tabIndex={0}
            aria-label={`Select Route ${index + 1}`}
            aria-pressed={isSelected}
            onClick={() => onSelectRoute(route.route_id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectRoute(route.route_id);
              }
            }}
            className={`group relative cursor-pointer overflow-hidden rounded-xl border p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              isSelected
                ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-950/30'
                : 'border-slate-800 bg-slate-900/70 hover:-translate-y-0.5 hover:border-slate-600'
            }`}
          >
            {isRecommended && (
              <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950">
                Recommended
              </span>
            )}

            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Option {index + 1}
            </p>
            <h3 className="mt-1 text-lg font-bold text-[#F8FAFC]">
              {route.label || `Route ${index + 1}`}
            </h3>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Distance</dt>
                <dd className="font-semibold text-slate-200">
                  {formatDistance(route.total_distance, unitSystem)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Drive time</dt>
                <dd className="font-semibold text-slate-200">
                  {formatDuration(route.total_time)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>High-risk distance</span>
                <span className="font-semibold text-red-300">
                  {formatDistance(dangerousMiles(route.risk_miles), unitSystem)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Severe distance</span>
                <span className="font-semibold">
                  {formatDistance(severeMiles(route.risk_miles), unitSystem)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Risk score</span>
                <span className="font-semibold">{route.total_risk_score.toFixed(0)}</span>
              </div>
            </div>

            <span
              className={`mt-4 inline-flex text-xs font-semibold ${
                isSelected ? 'text-amber-300' : 'text-slate-500 group-hover:text-slate-300'
              }`}
            >
              {isSelected ? 'Selected on map' : 'View on map'}
            </span>
          </div>
        );
      })}
    </section>
  );
};
