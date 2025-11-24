import { StateCreator } from 'zustand';
import { AlertsStore, Alert, AlertRule, AlertsState, AlertSummary } from '@/types/alerts';
import { getCookie } from '@/lib/get-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL! || 'http://localhost:8000';



export const initialAlertsState: AlertsState = {
  alerts: [],
  alertRules: [],
  activeAlerts: [],
  unacknowledgedAlerts: [],
  alertSummary: null,
  isLoading: false,
  error: null,
  alertFilters: {
    severity: 'ALL',
    alert_type: 'ALL',
    is_acknowledged: false,
    time_range: '24h'
  },
  isCheckingConditions: false,
  lastChecked: null,
};

export const createAlertsSlice: StateCreator<AlertsStore> = (set, get) => ({
  ...initialAlertsState,

  // ✅ Simple state setters
  setAlerts: (alerts: Alert[]) => {
    const activeAlerts = alerts.filter(alert => alert.is_active);
    const unacknowledgedAlerts = activeAlerts.filter(alert => !alert.is_acknowledged);
    
    set({ 
      alerts,
      activeAlerts,
      unacknowledgedAlerts 
    });
  },

  setAlertRules: (rules: AlertRule[]) => {
    set({ alertRules: rules });
  },

  setActiveAlerts: (alerts: Alert[]) => {
    set({ activeAlerts: alerts });
  },

  setUnacknowledgedAlerts: (alerts: Alert[]) => {
    set({ unacknowledgedAlerts: alerts });
  },

  setAlertSummary: (summary: AlertSummary | null) => {
    set({ alertSummary: summary });
  },

  setAlertFilters: (filters: Partial<AlertsState['alertFilters']>) => {
    set({ 
      alertFilters: { ...get().alertFilters, ...filters } 
    });
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

  setCheckingConditions: (checking: boolean) => {
    set({ isCheckingConditions: checking });
  },

  setLastChecked: (timestamp: string) => {
    set({ lastChecked: timestamp });
  },

  // ------------------------
  // 🔹 API Actions
  // ------------------------

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      const { alertFilters } = get();
      
      // Build query parameters from filters
      const params = new URLSearchParams();
      if (alertFilters.severity !== 'ALL') params.append('severity', alertFilters.severity);
      if (alertFilters.alert_type !== 'ALL') params.append('alert_type', alertFilters.alert_type);
      if (alertFilters.is_acknowledged !== 'ALL') params.append('is_acknowledged', alertFilters.is_acknowledged.toString());
      if (alertFilters.time_range !== 'all') params.append('hours', alertFilters.time_range === '1h' ? '1' : alertFilters.time_range === '7d' ? '168' : '24');
      
      const url = `${API_BASE_URL}/api/alerts/alerts/${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      const result = await response.json();
      const alerts = Array.isArray(result) ? result : result.results || result.data || [];

      get().setAlerts(alerts);
      set({ isLoading: false });

      return { success: true, alerts };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch alerts';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchActiveAlerts: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/active/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch active alerts: ${response.statusText}`);
      }

      const result = await response.json();
      const alerts: Alert[] = Array.isArray(result) ? result : result.results || result.data || [];

      set({ 
        activeAlerts: alerts,
        unacknowledgedAlerts: alerts.filter(alert => !alert.is_acknowledged),
        isLoading: false 
      });

      return { success: true, alerts };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch active alerts';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchAlertSummary: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/summary/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alert summary: ${response.statusText}`);
      }

      const result = await response.json();
      const summary = result.data || result;

      set({ 
        alertSummary: summary,
        isLoading: false 
      });

      return { success: true, summary };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch alert summary';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  fetchAlertRules: async () => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/alerts/rules/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alert rules: ${response.statusText}`);
      }

      const result = await response.json();
      const rules = Array.isArray(result) ? result : result.results || result.data || [];

      set({ 
        alertRules: rules,
        isLoading: false 
      });

      return { success: true, rules };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch alert rules';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  acknowledgeAlert: async (alertId: string) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/${alertId}/acknowledge/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
      }

      const result = await response.json();
      const updatedAlert = result.data || result;

      // Update the alert in state
      const updatedAlerts = get().alerts.map(alert => 
        alert.id === alertId ? updatedAlert : alert
      );

      get().setAlerts(updatedAlerts);
      set({ isLoading: false });

      return { success: true, alert: updatedAlert };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to acknowledge alert';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  bulkAcknowledgeAlerts: async (alertIds: string[]) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/bulk-acknowledge/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify({ alert_ids: alertIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to bulk acknowledge alerts: ${response.statusText}`);
      }

      const result = await response.json();

      // Refresh alerts to get updated status
      await get().fetchAlerts();
      set({ isLoading: false });

      return { success: true, count: result.alerts_acknowledged };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk acknowledge alerts';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  escalateAlert: async (alertId: string) => {
    set({ isLoading: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/${alertId}/escalate/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to escalate alert: ${response.statusText}`);
      }

      const result = await response.json();
      const updatedAlert = result.data || result;

      // Update the alert in state
      const updatedAlerts = get().alerts.map(alert => 
        alert.id === alertId ? updatedAlert : alert
      );

      get().setAlerts(updatedAlerts);
      set({ isLoading: false });

      return { success: true, alert: updatedAlert };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to escalate alert';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  checkAlertConditions: async () => {
    set({ isCheckingConditions: true, error: null });

    try {
      const csrfToken = await getCookie();
      
      const response = await fetch(`${API_BASE_URL}/api/alerts/alerts/check-conditions/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check alert conditions: ${response.statusText}`);
      }

      const result = await response.json();

      // Refresh alerts to see new ones
      await get().fetchAlerts();
      
      set({ 
        isCheckingConditions: false,
        lastChecked: new Date().toISOString()
      });

      return { success: true, alertsGenerated: result.alerts_generated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check alert conditions';
      set({ error: message, isCheckingConditions: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Utility Actions
  // ------------------------

  getAlertsBySeverity: (severity: Alert['severity']) => {
    const { alerts } = get();
    return alerts.filter(alert => alert.severity === severity && alert.is_active);
  },

  getAlertsByType: (type: Alert['alert_type']) => {
    const { alerts } = get();
    return alerts.filter(alert => alert.alert_type === type && alert.is_active);
  },

  getCriticalAlerts: () => {
    const { alerts } = get();
    return alerts.filter(alert => 
      (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') && 
      alert.is_active && 
      !alert.is_acknowledged
    );
  },

  hasUnacknowledgedCriticalAlerts: () => {
    return get().getCriticalAlerts().length > 0;
  },

  clearAlerts: () => {
    set({
      alerts: [],
      activeAlerts: [],
      unacknowledgedAlerts: [],
      alertSummary: null,
    });
  },

  updateAlertStatus: (alertId: string, updates: Partial<Alert>) => {
    const updatedAlerts = get().alerts.map(alert => 
      alert.id === alertId ? { ...alert, ...updates } : alert
    );
    get().setAlerts(updatedAlerts);
  },
});