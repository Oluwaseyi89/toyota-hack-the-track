import { AuthStore } from './auth';
import { TelemetryStore } from './telemetry';
import { StrategyStore } from './strategy';
import { AnalyticsStore } from './analytics';
import { AlertsStore } from './alerts';

/**
 * 🔹 RootStore — combined type of all slices
 */
export type RootStore = 
  AuthStore & 
  TelemetryStore & 
  StrategyStore & 
  AnalyticsStore & 
  AlertsStore;

/**
 * 🔹 Store initialization options
 */
export interface StoreConfig {
  // Add any store configuration options here
}