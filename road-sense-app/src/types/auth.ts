export interface User {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'RACE_ENGINEER' | 'STRATEGIST' | 'TEAM_MANAGER' | 'DATA_ANALYST' | 'VIEWER';
    team: string;
    can_access_live_data: boolean;
    can_modify_strategy: boolean;
    can_acknowledge_alerts: boolean;
    preferred_vehicle: string | null;
    last_activity: string;
  }
  
  export interface UserSession {
    id: string;
    user: User;
    ip_address: string | null;
    login_time: string;
    last_activity: string;
    is_active: boolean;
  }
  
  export interface AuthState {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    error: string | null;
    permissions: {
      can_access_live_data: boolean;
      can_modify_strategy: boolean;
      can_acknowledge_alerts: boolean;
    };
  }
  
  export interface AuthActions {
    // State setters
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    
    // API actions
    register: (userData: {
      username: string;
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      role: string;
    }) => Promise<{ success: boolean; user?: User }>;
    login: (username: string, password: string) => Promise<{ success: boolean; user?: User }>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<{ success: boolean; user?: User }>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean }>;
    
    // Utility
    updateUserActivity: () => void;
  }
  
  export type AuthStore = AuthState & AuthActions;