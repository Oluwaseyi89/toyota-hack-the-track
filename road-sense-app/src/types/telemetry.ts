export interface Vehicle {
  id: string;
  number: number;
  team: string;
  driver: string;
  vehicle_id: string;
}

export interface TireTelemetry {
  id: string;
  front_left_temp: number | null;
  front_right_temp: number | null;
  rear_left_temp: number | null;
  rear_right_temp: number | null;
  front_left_pressure: number | null;
  front_right_pressure: number | null;
  rear_left_pressure: number | null;
  rear_right_pressure: number | null;
}

export interface TelemetryData {
  id: string;
  vehicle: Vehicle;
  lap_number: number;
  lap_time: string; // Duration string
  lap_time_seconds: number;
  sector1_time: string | null;
  sector2_time: string | null;
  sector3_time: string | null;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
  position: number;
  gap_to_leader: number;
  timestamp: string;
  tire_data?: TireTelemetry;
}

export interface WeatherData {
  id: string;
  track_temperature: number;
  air_temperature: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  rainfall: number;
  timestamp: string;
}

export interface LiveTelemetry {
  vehicle_id: string;
  lap_number: number;
  lap_time: number;
  speed: number;
  position: number;
  gap_to_leader: number;
  timestamp: string;
}


export interface WebSocketMessage {
  type: 'telemetry' | 'weather' | 'tire' | 'alert' | 'current_telemetry' | 'current_data' | 'connection_established';
  data?: any;
  telemetry?: any;
  weather?: any;
  message?: string; // Add this line to fix the error
}

export interface TelemetryState {
  // Data collections
  vehicles: Vehicle[];
  telemetryData: TelemetryData[];
  weatherData: WeatherData | null;
  
  // Real-time data
  liveTelemetry: LiveTelemetry[];
  lastUpdate: string | null;
  
  // WebSocket state
  isWebSocketConnected: boolean;
  webSocketError: string | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Filters and preferences
  selectedVehicle: Vehicle | null;
  timeRange: 'realtime' | 'session' | 'all';
  
  // WebSocket instance
  webSocket: WebSocket | null;
}

export interface TelemetryActions {
  // State setters
  setVehicles: (vehicles: Vehicle[]) => void;
  setTelemetryData: (data: TelemetryData[]) => void;
  setWeatherData: (data: WeatherData | null) => void;
  setLiveTelemetry: (data: LiveTelemetry[]) => void;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setTimeRange: (range: 'realtime' | 'session' | 'all') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // WebSocket actions
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  sendWebSocketMessage: (message: any) => void;
  
  // API actions
  fetchVehicles: () => Promise<{ success: boolean; vehicles?: Vehicle[] }>;
  fetchCurrentTelemetry: () => Promise<{ success: boolean; data?: TelemetryData[] }>;
  fetchVehicleTelemetry: (vehicleNumber: number) => Promise<{ success: boolean; data?: TelemetryData[] }>;
  fetchCurrentWeather: () => Promise<{ success: boolean; weather?: WeatherData }>;
  simulateTelemetry: () => Promise<{ success: boolean; count?: number }>;
  
  // Utility actions
  updateLiveData: (newData: LiveTelemetry) => void;
  clearTelemetryData: () => void;
}

export type TelemetryStore = TelemetryState & TelemetryActions;

