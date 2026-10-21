export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe' | 'No Travel';

export type JobStatusValue = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type UnitSystem = 'imperial' | 'metric';

export interface GeocodeResult {
  label: string;
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  timezone: string;
}

export interface RouteRequest {
  origin: GeocodeResult;
  destination: GeocodeResult;
  departure_date: string;
  departure_time: string;
  load_weight: number;
  load_weight_unit: 'lb' | 'kg';
  unit_system: UnitSystem;
}

export interface Checkpoint {
  latitude: number;
  longitude: number;
  estimated_arrival: string;
  weather_data: Record<string, number>;
  risk_level: RiskLevel;
  mile_marker: number;
}

export interface RouteDetail {
  route_id: string;
  label: string;
  polyline: string;
  total_distance: number;
  total_time: number;
  risk_miles: Partial<Record<RiskLevel, number>>;
  total_risk_score: number;
  checkpoints: Checkpoint[];
}

export interface RouteResult {
  job_id: string;
  recommended_route_id: string | null;
  origin: GeocodeResult;
  destination: GeocodeResult;
  departure_time: string;
  unit_system: UnitSystem;
  routes: RouteDetail[];
}

export interface RouteJob {
  id: string;
  status: JobStatusValue;
  created_at: string;
  error_message?: string;
  origin?: GeocodeResult;
  destination?: GeocodeResult;
  departure_time?: string;
  unit_system?: UnitSystem;
  result?: RouteResult;
}


export interface ForecastCheckpoint {
  latitude: number;
  longitude: number;
  weather_data: Record<string, number>;
  risk_level: RiskLevel;
  mile_marker: number;
}

export interface ForecastRoute {
  route_id: string;
  risk_miles: Partial<Record<RiskLevel, number>>;
  total_risk_score: number;
  checkpoints: ForecastCheckpoint[];
}

export interface RouteForecast {
  job_id: string;
  forecast_hour: number;
  forecast_time: string;
  routes: ForecastRoute[];
}
