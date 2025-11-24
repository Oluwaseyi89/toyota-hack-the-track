'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRootStore } from '@/store';

/**
 * This AuthProvider is now mainly for initializing auth state
 * and providing a compatibility layer for components that still use useAuth()
 */
interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
  permissions: {
    can_access_live_data: boolean;
    can_modify_strategy: boolean;
    can_acknowledge_alerts: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    permissions, 
    logout, 
    getCurrentUser,
    setLoading 
  } = useRootStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        await getCurrentUser();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [getCurrentUser, setLoading]);

  const authContextValue: AuthContextType = {
    user,
    isLoading,
    logout,
    isAuthenticated,
    permissions,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  // Fallback to direct store access if context is not available
  if (context === undefined) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user, isLoading, isAuthenticated, permissions, logout } = useRootStore();
    
    return {
      user,
      isLoading,
      logout,
      isAuthenticated,
      permissions,
    };
  }
  
  return context;
}

