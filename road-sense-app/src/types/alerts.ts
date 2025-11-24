export interface Alert {
    id: string;
    vehicle: any | null;
    alert_type: 'TIRE_WEAR' | 'FUEL_LOW' | 'WEATHER_CHANGE' | 'STRATEGY_OPPORTUNITY' | 'COMPETITOR_THREAT' | 'SYSTEM_WARNING' | 'PERFORMANCE_DROP';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    message: string;
    recommended_action: string;
    triggered_by: {
      [key: string]: any;
    };
    is_active: boolean;
    is_acknowledged: boolean;
    created_at: string;
    acknowledged_at: string | null;
  }
  
  export interface AlertRule {
    id: string;
    name: string;
    alert_type: Alert['alert_type'];
    condition: {
      [key: string]: any;
    };
    severity: Alert['severity'];
    message_template: string;
    action_template: string;
    is_active: boolean;
    created_at: string;
  }
  
  export interface AlertSummary {
    statistics: {
      total_active_alerts: number;
      high_severity_alerts: number;
      unacknowledged_alerts: number;
      alerts_last_24h: number;
    };
    distribution: Array<{
      alert_type: string;
      count: number;
    }>;
    recent_alerts: Alert[];
    timestamp: string;
  }
  
  export interface AlertsState {
    // Data collections
    alerts: Alert[];
    alertRules: AlertRule[];
    
    // Current state
    activeAlerts: Alert[];
    unacknowledgedAlerts: Alert[];
    alertSummary: AlertSummary | null;
    
    // UI state
    isLoading: boolean;
    error: string | null;
    
    // Filters and preferences
    alertFilters: {
      severity: Alert['severity'] | 'ALL';
      alert_type: Alert['alert_type'] | 'ALL';
      is_acknowledged: boolean | 'ALL';
      time_range: '1h' | '24h' | '7d' | 'all';
    };
    
    // Alert checking state
    isCheckingConditions: boolean;
    lastChecked: string | null;
  }
  
  export interface AlertsActions {
    // State setters
    setAlerts: (alerts: Alert[]) => void;
    setAlertRules: (rules: AlertRule[]) => void;
    setActiveAlerts: (alerts: Alert[]) => void;
    setUnacknowledgedAlerts: (alerts: Alert[]) => void;
    setAlertSummary: (summary: AlertSummary | null) => void;
    setAlertFilters: (filters: Partial<AlertsState['alertFilters']>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    setCheckingConditions: (checking: boolean) => void;
    setLastChecked: (timestamp: string) => void;
    
    // API actions
    fetchAlerts: () => Promise<{ success: boolean; alerts?: Alert[] }>;
    fetchActiveAlerts: () => Promise<{ success: boolean; alerts?: Alert[] }>;
    fetchAlertSummary: () => Promise<{ success: boolean; summary?: AlertSummary }>;
    fetchAlertRules: () => Promise<{ success: boolean; rules?: AlertRule[] }>;
    acknowledgeAlert: (alertId: string) => Promise<{ success: boolean; alert?: Alert }>;
    bulkAcknowledgeAlerts: (alertIds: string[]) => Promise<{ success: boolean; count?: number }>;
    escalateAlert: (alertId: string) => Promise<{ success: boolean; alert?: Alert }>;
    checkAlertConditions: () => Promise<{ success: boolean; alertsGenerated?: number }>;
    
    // Utility actions
    getAlertsBySeverity: (severity: Alert['severity']) => Alert[];
    getAlertsByType: (type: Alert['alert_type']) => Alert[];
    getCriticalAlerts: () => Alert[];
    hasUnacknowledgedCriticalAlerts: () => boolean;
    clearAlerts: () => void;
    updateAlertStatus: (alertId: string, updates: Partial<Alert>) => void;
  }
  
  export type AlertsStore = AlertsState & AlertsActions;