export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    units: 'metric' | 'imperial';
    refreshRate: number; // in seconds
    notifications: {
      email: boolean;
      push: boolean;
      sound: boolean;
    };
    dashboardLayout: 'compact' | 'detailed' | 'custom';
  }
  
  export interface SystemSettings {
    apiEndpoint: string;
    dataRetention: number; // days
    autoRefresh: boolean;
    simulationMode: boolean;
    debugMode: boolean;
  }
  
  export interface SettingsState {
    preferences: UserPreferences;
    system: SystemSettings;
    isLoading: boolean;
    error: string | null;
  }
  
  export interface SettingsActions {
    setPreferences: (preferences: Partial<UserPreferences>) => void;
    setSystemSettings: (settings: Partial<SystemSettings>) => void;
    resetToDefaults: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    saveSettings: () => Promise<{ success: boolean }>;
    loadSettings: () => Promise<{ success: boolean }>;
  }
  
  export type SettingsStore = SettingsState & SettingsActions;