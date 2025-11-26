import { StateCreator } from 'zustand';
import { SettingsStore, UserPreferences, SettingsState, SystemSettings } from '@/types/settings';

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  units: 'metric',
  refreshRate: 5,
  notifications: {
    email: true,
    push: false,
    sound: true,
  },
  dashboardLayout: 'detailed',
};

const defaultSystemSettings: SystemSettings = {
  apiEndpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  dataRetention: 30,
  autoRefresh: true,
  simulationMode: false,
  debugMode: false,
};

export const initialSettingsState: SettingsState = {
  preferences: defaultPreferences,
  system: defaultSystemSettings,
  isLoading: false,
  error: null,
};

export const createSettingsSlice: StateCreator<SettingsStore> = (set, get) => ({
  ...initialSettingsState,

  // ✅ Simple state setters
  setPreferences: (newPreferences: Partial<UserPreferences>) => {
    set((state) => ({
      preferences: { ...state.preferences, ...newPreferences },
    }));
  },

  setSystemSettings: (newSettings: Partial<SystemSettings>) => {
    set((state) => ({
      system: { ...state.system, ...newSettings },
    }));
  },

  resetToDefaults: () => {
    set({
      preferences: defaultPreferences,
      system: defaultSystemSettings,
      error: null,
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

  // ------------------------
  // 🔹 API Actions
  // ------------------------

  saveSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { preferences, system } = get();
      
      // In a real app, you would send this to your backend
      console.log('Saving settings:', { preferences, system });
      
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },

  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      // Simulate API call to load settings
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, you would fetch this from your backend
      // For now, we'll just use the defaults
      
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      set({ error: message, isLoading: false });
      return { success: false };
    }
  },
});