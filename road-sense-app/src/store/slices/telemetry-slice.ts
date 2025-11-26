import { StateCreator } from 'zustand';
import { TelemetryStore, Vehicle, TelemetryData, TelemetryState, WeatherData, LiveTelemetry, WebSocketMessage } from '@/types/telemetry';
import { getCookie } from '@/lib/get-cookie';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL! || 'http://localhost:8000';



export const initialTelemetryState: TelemetryState = {
  vehicles: [],
  telemetryData: [],
  weatherData: null,
  liveTelemetry: [],
  lastUpdate: null,
  isWebSocketConnected: false,
  webSocketError: null,
  isLoading: false,
  error: null,
  selectedVehicle: null,
  timeRange: 'realtime',
  webSocket: null,
};

export const createTelemetrySlice: StateCreator<TelemetryStore> = (set, get) => ({
  ...initialTelemetryState,

  // ✅ Simple state setters
  setVehicles: (vehicles: Vehicle[]) => {
    set({ vehicles });
  },

  setTelemetryData: (data: TelemetryData[]) => {
    set({ telemetryData: data });
  },

  setWeatherData: (data: WeatherData | null) => {
    set({ weatherData: data });
  },

  setLiveTelemetry: (data: LiveTelemetry[]) => {
    set({ liveTelemetry: data, lastUpdate: new Date().toISOString() });
  },

  setSelectedVehicle: (vehicle: Vehicle | null) => {
    set({ selectedVehicle: vehicle });
  },

  setTimeRange: (range: 'realtime' | 'session' | 'all') => {
    set({ timeRange: range });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // ------------------------
  // 🔹 WebSocket Management
  // ------------------------
  connectWebSocket: () => {
    // Don't connect if already connected or in SSR
    if (typeof window === 'undefined' || get().isWebSocketConnected) {
      return;
    }

    try {
      // Determine WebSocket URL (adjust based on your Django channels setup)
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/telemetry/`;
      
      const websocket = new WebSocket(wsUrl);

      // Define message handler first
      const handleWebSocketMessage = (message: WebSocketMessage) => {
        switch (message.type) {
          case 'connection_established':
            console.log('WebSocket connection established:', message.message);
            break;

          case 'telemetry':
            if (message.data) {
              get().updateLiveData(message.data);
            }
            break;

          case 'weather':
            if (message.data) {
              get().setWeatherData(message.data);
            }
            break;

          case 'current_telemetry':
            if (message.data) {
              // Handle initial telemetry data
              get().setTelemetryData(message.data);
            }
            break;

          case 'current_data':
            if (message.telemetry) {
              get().setTelemetryData(message.telemetry);
            }
            if (message.weather) {
              get().setWeatherData(message.weather);
            }
            break;

          case 'tire':
            // Handle tire-specific updates
            console.log('Tire update received:', message.data);
            break;

          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      };

      websocket.onopen = () => {
        console.log('WebSocket connected to telemetry stream');
        set({ 
          isWebSocketConnected: true, 
          webSocketError: null,
          webSocket: websocket 
        });

        // Subscribe to telemetry updates
        get().sendWebSocketMessage({
          type: 'subscribe_telemetry'
        });

        // Request current data
        get().sendWebSocketMessage({
          type: 'request_current_data'
        });
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        set({ 
          isWebSocketConnected: false, 
          webSocket: null 
        });

        // Attempt reconnection after delay
        if (event.code !== 1000) { // Don't reconnect if closed normally
          setTimeout(() => {
            if (!get().isWebSocketConnected) {
              get().connectWebSocket();
            }
          }, 5000);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        set({ 
          webSocketError: 'WebSocket connection failed',
          isWebSocketConnected: false 
        });
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      set({ webSocketError: 'Failed to create WebSocket connection' });
    }
  },

  disconnectWebSocket: () => {
    const { webSocket } = get();
    if (webSocket) {
      webSocket.close(1000, 'User initiated disconnect');
    }
    set({ 
      isWebSocketConnected: false, 
      webSocket: null,
      webSocketError: null 
    });
  },

  sendWebSocketMessage: (message: any) => {
    const { webSocket, isWebSocketConnected } = get();
    if (webSocket && isWebSocketConnected && webSocket.readyState === WebSocket.OPEN) {
      webSocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  },

  // ------------------------
  // 🔹 API Actions
  // ------------------------
  fetchVehicles: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/telemetry/vehicles/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
      }

      const result = await response.json();
      const vehicles = Array.isArray(result) ? result : result.results || result.data || [];

      set({ vehicles, isLoading: false });
      return { success: true, vehicles };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch vehicles';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchCurrentTelemetry: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/telemetry/data/current/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch current telemetry: ${response.statusText}`);
      }

      const result = await response.json();
      const data = result.data || result;

      set({ telemetryData: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch current telemetry';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchVehicleTelemetry: async (vehicleNumber: number) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(
        `${API_BASE_URL}/api/telemetry/data/vehicle/?vehicle_number=${vehicleNumber}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-csrftoken': csrfToken,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle telemetry: ${response.statusText}`);
      }

      const result = await response.json();
      const data = result.data || result;

      set({ telemetryData: data, isLoading: false });
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch vehicle telemetry';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchCurrentWeather: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/telemetry/weather/current/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch current weather: ${response.statusText}`);
      }

      const result = await response.json();
      const weather = result.data || result;

      set({ weatherData: weather, isLoading: false });
      return { success: true, weather };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch current weather';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  simulateTelemetry: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/telemetry/data/simulate/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to simulate telemetry: ${response.statusText}`);
      }

      const result = await response.json();
      
      set({ isLoading: false });
      return { success: true, count: result.count };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to simulate telemetry';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Utility Actions
  // ------------------------
  updateLiveData: (newData: LiveTelemetry) => {
    const { liveTelemetry } = get();
    
    // Update or add the vehicle's telemetry
    const updatedTelemetry = liveTelemetry.filter(
      data => data.vehicle_id !== newData.vehicle_id
    );
    updatedTelemetry.unshift(newData);
    
    // Keep only the latest 100 records to prevent memory issues
    const limitedTelemetry = updatedTelemetry.slice(0, 100);
    
    set({ 
      liveTelemetry: limitedTelemetry,
      lastUpdate: new Date().toISOString() 
    });
  },

  clearTelemetryData: () => {
    set({ 
      telemetryData: [],
      liveTelemetry: [],
      lastUpdate: null 
    });
  },
});
