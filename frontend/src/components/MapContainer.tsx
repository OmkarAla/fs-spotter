import React, { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer as LeafletMapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type {
  Checkpoint,
  ForecastCheckpoint,
  RiskLevel,
  RouteForecast,
  RouteResult,
} from '../types/api';
import { useRouteStore } from '../store/routeStore';
import {
  buildCorridorHeatPoints,
  buildRiskSegments,
  decodePolyline,
  formatDuration,
  riskColor,
  type LatLng,
} from '../utils/geo';
import {
  formatDistance,
  formatRain,
  formatSnow,
  formatWind,
} from '../utils/units';
import { CorridorHeatLayer } from './CorridorHeatLayer';

const mapTilerTileUrl = (): string | null => {
  const key = (import.meta.env.VITE_MAPTILER_KEY ?? '').trim();
  return key
    ? `https://api.maptiler.com/maps/streets-v4-dark/256/{z}/{x}/{y}.png?key=${key}`
    : null;
};

interface MapContainerProps {
  result: RouteResult | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  forecastTime?: number;
  forecast?: RouteForecast | null;
  forecastLoading?: boolean;
}

const LEGEND: RiskLevel[] = ['Low', 'Moderate', 'High', 'Severe', 'No Travel'];

const formatTimestamp = (value?: string, timeZone?: string): string => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
};

const MapViewport: React.FC<{ positions: LatLng[] }> = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, positions]);

  return null;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  result,
  selectedRouteId,
  onSelectRoute,
  forecastTime = 48,
  forecast = null,
  forecastLoading = false,
}) => {
  const [showAllCheckpoints, setShowAllCheckpoints] = useState(false);
  const unitSystem = useRouteStore((state) => state.unitSystem);
  const routePositions = useMemo(
    () =>
      result?.routes.flatMap((route) => decodePolyline(route.polyline)) ?? [],
    [result],
  );

  const selectedIndex =
    result?.routes.findIndex((route) => route.route_id === selectedRouteId) ?? -1;
  const selectedRoute = result?.routes[selectedIndex] ?? null;
  const selectedRoutePositions = useMemo(
    () =>
      selectedRoute ? decodePolyline(selectedRoute.polyline) : routePositions,
    [selectedRoute, routePositions],
  );
  const selectedForecast =
    forecast?.routes.find((route) => route.route_id === selectedRouteId) ?? null;
  const riskCheckpoints = useMemo<Array<Checkpoint | ForecastCheckpoint>>(
    () => selectedForecast?.checkpoints ?? selectedRoute?.checkpoints ?? [],
    [selectedForecast, selectedRoute],
  );
  const heatPoints = useMemo(
    () => buildCorridorHeatPoints(riskCheckpoints),
    [riskCheckpoints],
  );
  const tileUrl = mapTilerTileUrl();

  if (!result) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 text-center">
        <div>
          <p className="text-sm font-semibold text-slate-300">
            Your route map will appear here
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Enter a trip above to compare weather risk across three routes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800">
      <LeafletMapContainer
        center={[25, 0]}
        zoom={3}
        scrollWheelZoom
        className="h-[480px] w-full bg-slate-950"
      >
        {tileUrl ? (
          <TileLayer
            attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={tileUrl}
          />
        ) : (
          <div className="absolute inset-x-0 top-0 z-[600] bg-amber-950/90 p-2 text-center text-xs text-amber-200">
            MapTiler key is missing. Set VITE_MAPTILER_KEY.
          </div>
        )}
        <MapViewport positions={selectedRoutePositions} />
        <CorridorHeatLayer points={heatPoints} />

        <CircleMarker
          center={[result.origin.latitude, result.origin.longitude]}
          radius={9}
          pathOptions={{
            color: '#22C55E',
            fillColor: '#22C55E',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-emerald-400">Origin</p>
              <p className="font-medium">{result.origin.name}</p>
              <p>{result.origin.label}</p>
              <p>
                Departure {formatTimestamp(result.departure_time, result.origin.timezone)}
              </p>
            </div>
          </Popup>
        </CircleMarker>

        <CircleMarker
          center={[result.destination.latitude, result.destination.longitude]}
          radius={9}
          pathOptions={{
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-red-400">Destination</p>
              <p className="font-medium">{result.destination.name}</p>
              <p>{result.destination.label}</p>
            </div>
          </Popup>
        </CircleMarker>

        {result.routes.map((route) => {
          const isSelected = route.route_id === selectedRouteId;
          const routeForecast = forecast?.routes.find(
            (candidate) => candidate.route_id === route.route_id,
          );
          const routeCheckpoints =
            routeForecast?.checkpoints ?? route.checkpoints;
          const polyline = decodePolyline(route.polyline);
          const segments = buildRiskSegments(route, routeCheckpoints);
          const checkpointStride = isSelected
            ? 1
            : Math.max(1, Math.ceil(routeCheckpoints.length / 120));
          const visibleCheckpoints = isSelected || showAllCheckpoints
            ? routeCheckpoints.filter(
                (_, index) =>
                  index % checkpointStride === 0 ||
                  index === routeCheckpoints.length - 1,
              )
            : [];

          return (
            <React.Fragment key={route.route_id}>
              <Polyline
                positions={polyline}
                pathOptions={{
                  color: isSelected ? '#F59E0B' : '#64748B',
                  weight: isSelected ? 9 : 4,
                  opacity: isSelected ? 0.95 : 0.4,
                }}
                eventHandlers={{ click: () => onSelectRoute(route.route_id) }}
              />

              {isSelected
                ? segments.map((segment, index) => (
                    <React.Fragment key={`${route.route_id}-segment-${index}`}>
                      <Polyline
                        positions={segment.positions}
                        pathOptions={{
                          color: riskColor(segment.risk),
                          weight: 18,
                          opacity: 0.16,
                        }}
                        interactive={false}
                      />
                      <Polyline
                        positions={segment.positions}
                        pathOptions={{
                          color: riskColor(segment.risk),
                          weight: 6,
                          opacity: 1,
                        }}
                        eventHandlers={{ click: () => onSelectRoute(route.route_id) }}
                      />
                    </React.Fragment>
                  ))
                : segments.map((segment, index) => (
                    <Polyline
                      key={`${route.route_id}-band-${index}`}
                      positions={segment.positions}
                      pathOptions={{
                        color: riskColor(segment.risk),
                        weight: 3,
                        opacity: 0.55,
                      }}
                      eventHandlers={{ click: () => onSelectRoute(route.route_id) }}
                    />
                  ))}

              {visibleCheckpoints.map((checkpoint, index) => {
                const arrival: string | undefined =
                  'estimated_arrival' in checkpoint
                    ? (checkpoint as Checkpoint).estimated_arrival
                    : forecast?.forecast_time;

                return (
                  <CircleMarker
                    key={`${route.route_id}-checkpoint-${index}`}
                    center={[checkpoint.latitude, checkpoint.longitude]}
                    radius={isSelected ? 4 : 2.5}
                    pathOptions={{
                      color: riskColor(checkpoint.risk_level),
                      fillColor: riskColor(checkpoint.risk_level),
                      fillOpacity: isSelected ? 0.9 : 0.65,
                      opacity: isSelected ? 1 : 0.7,
                      weight: 1,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold">
                          {route.label} · {formatDistance(checkpoint.mile_marker, unitSystem)} ·{' '}
                          {checkpoint.risk_level}
                        </p>
                        <p>
                          {routeForecast ? 'Forecast' : 'ETA'}{' '}
                          {formatTimestamp(arrival, result.origin.timezone)}
                        </p>
                        <p>
                          Wind{' '}
                          {checkpoint.weather_data.wind != null
                            ? formatWind(checkpoint.weather_data.wind, unitSystem)
                            : '—'}{' '}
                          · Rain{' '}
                          {checkpoint.weather_data.rain != null
                            ? formatRain(checkpoint.weather_data.rain, unitSystem)
                            : '—'}{' '}
                          · Snow{' '}
                          {checkpoint.weather_data.snow != null
                            ? formatSnow(checkpoint.weather_data.snow, unitSystem)
                            : '—'}
                        </p>
                        <p>Drive time {formatDuration(route.total_time)}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </React.Fragment>
          );
        })}
      </LeafletMapContainer>

      <div className="pointer-events-none absolute left-16 top-3 z-[500] rounded-lg border border-slate-700/80 bg-slate-950/85 px-3 py-2 text-xs text-slate-200 backdrop-blur">
        {selectedIndex >= 0
          ? `${selectedRoute?.label ?? `Route ${selectedIndex + 1}`} · ${
              selectedIndex + 1
            } of ${result.routes.length}`
          : 'All routes'}
        {result.recommended_route_id === selectedRouteId && (
          <span className="ml-2 font-semibold text-emerald-400">Recommended</span>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-lg border border-amber-500/40 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-amber-300 backdrop-blur">
        Forecast +{forecastTime}h{forecastLoading ? ' · updating' : ''}
      </div>

      <button
        type="button"
        aria-pressed={showAllCheckpoints}
        onClick={() => setShowAllCheckpoints((visible) => !visible)}
        className="absolute right-3 top-16 z-[500] rounded-lg border border-slate-700/80 bg-slate-950/85 px-3 py-2 text-xs font-medium text-slate-200 backdrop-blur transition-colors hover:border-slate-500 hover:text-white"
      >
        {showAllCheckpoints ? 'Hide all checkpoints' : 'Show all checkpoints'}
      </button>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-lg border border-slate-700/80 bg-slate-950/85 p-3 backdrop-blur">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Risk
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {LEGEND.map((level) => (
            <span key={level} className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: riskColor(level) }}
              />
              {level}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Heat layer blends risk intensity along the selected corridor.
        </p>
      </div>
    </div>
  );
};
