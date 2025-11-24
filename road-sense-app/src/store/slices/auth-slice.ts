import { StateCreator } from 'zustand';
import { AuthStore, User } from '@/types/auth';
import { getCookie } from '@/lib/get-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL! || 'http://localhost:8000';



export const initialAuthState = {
  user: null,
  loading: false,
  isAuthenticated: false,
  error: null,
  permissions: {
    can_access_live_data: false,
    can_modify_strategy: false,
    can_acknowledge_alerts: false,
  },
};

export const createAuthSlice: StateCreator<AuthStore> = (set, get) => ({
  ...initialAuthState,

  // ✅ Simple state setters
  setUser: (user: User | null) => {
    const permissions = user ? {
      can_access_live_data: user.can_access_live_data,
      can_modify_strategy: user.can_modify_strategy,
      can_acknowledge_alerts: user.can_acknowledge_alerts,
    } : initialAuthState.permissions;

    set({ 
      user, 
      isAuthenticated: !!user,
      permissions 
    });

    // Store user in localStorage for persistence
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('auth-user', JSON.stringify(user));
      } else {
        localStorage.removeItem('auth-user');
      }
    }
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  register: async (userData) => {
    set({ loading: true, error: null });
  
    try {
      const csrfToken = await getCookie();
  
      const response = await fetch(`${API_BASE_URL}/api/accounts/auth/register/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify(userData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Registration failed');
      }
  
      const result = await response.json();
      const user = result.user;
  
      // Auto-login after successful registration
      get().setUser(user);
  
      set({ loading: false });
      return { success: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ error: message, loading: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Login with username/password
  // ------------------------
  login: async (username: string, password: string) => {
    set({ loading: true, error: null });

    try {
      const csrfToken = await getCookie();

      const response = await fetch(`${API_BASE_URL}/api/accounts/auth/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Login failed');
      }

      const result = await response.json();
      const user = result.user;

      // Update state with user data
      get().setUser(user);

      set({ loading: false });
      return { success: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, loading: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Logout
  // ------------------------
  logout: async () => {
    set({ loading: true, error: null });

    try {
      const csrfToken = await getCookie();

      const response = await fetch(`${API_BASE_URL}/api/accounts/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      // Clear local state regardless of API response
      get().setUser(null);
      set({ loading: false });

      if (!response.ok) {
        console.warn('Logout API call failed, but local state cleared');
      }

      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      
      // Still clear local state even if API call fails
      get().setUser(null);
      set({ loading: false, error: message });
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  // ------------------------
  // 🔹 Get Current User
  // ------------------------
  getCurrentUser: async () => {
    set({ loading: true, error: null });

    try {
      // First check localStorage for cached user
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('auth-user');
        if (cachedUser) {
          const user = JSON.parse(cachedUser);
          get().setUser(user);
        }
      }

      const csrfToken = await getCookie();

      console.log("Sent CsrfToken: ", csrfToken);

      const response = await fetch(`${API_BASE_URL}/api/accounts/auth/me/`, {
        method: 'GET',
        // mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, clear any cached data
          get().setUser(null);
          set({ loading: false });
          return { success: false };
        }
        throw new Error('Failed to fetch current user');
      }

      const result = await response.json();
      const user = result.user;

      get().setUser(user);
      set({ loading: false });
      return { success: true, user };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get current user';
      set({ error: message, loading: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Change Password
  // ------------------------
  changePassword: async (oldPassword: string, newPassword: string) => {
    set({ loading: true, error: null });

    try {
      const csrfToken = await getCookie();

      const response = await fetch(`${API_BASE_URL}/api/accounts/auth/change-password/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrftoken': csrfToken,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Password change failed');
      }

      set({ loading: false });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      set({ error: message, loading: false });
      return { success: false };
    }
  },

  // ------------------------
  // 🔹 Update User Activity
  // ------------------------
  updateUserActivity: () => {
    const { user } = get();
    if (user && typeof window !== 'undefined') {
      // Update localStorage with current timestamp
      const updatedUser = {
        ...user,
        last_activity: new Date().toISOString(),
      };
      localStorage.setItem('auth-user', JSON.stringify(updatedUser));
    }
  },
});