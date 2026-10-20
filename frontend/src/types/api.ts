export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe' | 'No Travel';

export type JobStatusValue = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface RouteRequest {
  origin: string;
  destination: string;
  departure_time: string;
  load_weight: number;
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
  routes: RouteDetail[];
}

export interface RouteJob {
  id: string;
  status: JobStatusValue;
  created_at: string;
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
