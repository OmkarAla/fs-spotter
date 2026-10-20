import React, { useEffect, useMemo } from 'react';
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
import {
  buildCorridorHeatPoints,
  buildRiskSegments,
  decodePolyline,
  formatDuration,
  riskColor,
  type LatLng,
} from '../utils/geo';
import { CorridorHeatLayer } from './CorridorHeatLayer';

interface MapContainerProps {
  result: RouteResult | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  forecastTime?: number;
  forecast?: RouteForecast | null;
  forecastLoading?: boolean;
}

const LEGEND: RiskLevel[] = ['Low', 'Moderate', 'High', 'Severe', 'No Travel'];

const formatTimestamp = (value?: string): string => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const MapViewport: React.FC<{ positions: LatLng[] }> = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] });
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
  const routePositions = useMemo(
    () =>
      result?.routes.flatMap((route) => decodePolyline(route.polyline)) ?? [],
    [result],
  );

  const selectedIndex =
    result?.routes.findIndex((route) => route.route_id === selectedRouteId) ?? -1;
  const selectedRoute = result?.routes[selectedIndex] ?? null;
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
  const isForecast = Boolean(selectedForecast);

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
        center={[39.5, -98.35]}
        zoom={4}
        scrollWheelZoom
        className="h-[480px] w-full bg-slate-950"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport positions={routePositions} />
        <CorridorHeatLayer points={heatPoints} />

        {result.routes.map((route) => {
          const isSelected = route.route_id === selectedRouteId;
          const polyline = decodePolyline(route.polyline);
          const segments = isSelected
            ? buildRiskSegments(route, riskCheckpoints)
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

              {segments.map((segment, index) => (
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
              ))}

              {isSelected &&
                riskCheckpoints.map((checkpoint, index) => {
                  const arrival = 'estimated_arrival' in checkpoint
                    ? checkpoint.estimated_arrival
                    : forecast?.forecast_time;

                  return (
                    <CircleMarker
                      key={`${route.route_id}-checkpoint-${index}`}
                      center={[checkpoint.latitude, checkpoint.longitude]}
                      radius={4}
                      pathOptions={{
                        color: riskColor(checkpoint.risk_level),
                        fillColor: riskColor(checkpoint.risk_level),
                        fillOpacity: 0.9,
                        opacity: 1,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold">
                            Mile {Math.round(checkpoint.mile_marker)} · {checkpoint.risk_level}
                          </p>
                          <p>
                            {isForecast ? 'Forecast' : 'ETA'}{' '}
                            {formatTimestamp(arrival)}
                          </p>
                          <p>
                            Wind {checkpoint.weather_data.wind?.toFixed(0) ?? '—'} mph ·
                            Rain {checkpoint.weather_data.rain?.toFixed(2) ?? '—'} in/hr ·
                            Snow {checkpoint.weather_data.snow?.toFixed(1) ?? '—'} in/hr
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
        {selectedIndex >= 0 ? `Route ${selectedIndex + 1} of ${result.routes.length}` : 'All routes'}
        {result.recommended_route_id === selectedRouteId && (
          <span className="ml-2 font-semibold text-emerald-400">Recommended</span>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-lg border border-amber-500/40 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-amber-300 backdrop-blur">
        Forecast +{forecastTime}h{forecastLoading ? ' · updating' : ''}
      </div>

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
