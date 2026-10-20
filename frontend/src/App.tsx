import React, { useEffect, useState } from 'react';
import { useRouteStore } from './store/routeStore';
import { useRoutePolling } from './hooks/useRoutePolling';
import { RouteControls } from './components/RouteControls';
import { JobStatus } from './components/JobStatus';
import { MapContainer } from './components/MapContainer';
import { RouteComparison } from './components/RouteComparison';
import { WeatherSlider } from './components/WeatherSlider';
import { formatDistance, formatDuration } from './utils/geo';

const App: React.FC = () => {
  const currentJobId = useRouteStore((state) => state.currentJobId);
  const result = useRouteStore((state) => state.result);
  const forecastTime = useRouteStore((state) => state.forecastTime);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  useRoutePolling(currentJobId);

  useEffect(() => {
    setSelectedRouteId(null);
  }, [currentJobId, result?.job_id]);

  const selectedRoute = result?.routes.find(
    (route) => route.route_id === selectedRouteId,
  );
  const recommendedRoute = result?.routes.find(
    (route) => route.route_id === result.recommended_route_id,
  );
  const activeRoute = selectedRoute ?? recommendedRoute ?? result?.routes[0] ?? null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_65%)]" />

      <header className="relative border-b border-slate-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B] text-lg font-black text-[#0F172A]">
              L
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Logistics OS</h1>
              <p className="text-xs text-slate-400">
                Weather-aware freight routing
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Risk engine online
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
            Route intelligence
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Find the safest lane through the weather.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Compare three route options against checkpoint-level wind, rain, snow,
            and load limits — then pick the lane with the fewest severe miles.
          </p>
        </section>

        <RouteControls />
        <JobStatus />

        {result && activeRoute && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Route comparison</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {result.routes.length} options analyzed · select a card to inspect
                  the corridor.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
                <span className="text-slate-400">Selected</span>
                <span className="font-semibold text-amber-300">
                  {formatDistance(activeRoute.total_distance)}
                </span>
                <span className="h-4 w-px bg-slate-700" />
                <span className="font-semibold text-slate-200">
                  {formatDuration(activeRoute.total_time)}
                </span>
              </div>
            </div>

            <WeatherSlider />
            <RouteComparison
              result={result}
              selectedRouteId={activeRoute.route_id}
              onSelectRoute={setSelectedRouteId}
            />
            <MapContainer
              result={result}
              selectedRouteId={activeRoute.route_id}
              onSelectRoute={setSelectedRouteId}
              forecastTime={forecastTime}
            />
          </section>
        )}

        {!result && (
          <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <MapContainer
              result={null}
              selectedRouteId={null}
              onSelectRoute={setSelectedRouteId}
            />
            <div className="grid gap-3">
              {[
                {
                  title: 'Three viable lanes',
                  body: 'Every request returns distinct route options with distance, drive time, and risk-mile totals.',
                },
                {
                  title: 'Checkpoint weather',
                  body: 'Wind, rain, and snow are evaluated at each checkpoint against the posted load rules.',
                },
                {
                  title: 'Explainable pick',
                  body: 'Recommendations rank severe miles first, then high-risk miles, risk score, and time.',
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700"
                >
                  <h3 className="text-sm font-semibold text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-800/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Logistics OS · Weather-aware routing</span>
          <span>Mock routing and weather data — thresholds follow the project brief.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
