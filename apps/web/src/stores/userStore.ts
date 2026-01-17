import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService, { User } from '../services/auth';

interface UserState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    role: 'student' | 'teacher',
    classJoinCode?: string
  ) => Promise<void>;
  setTokenAndRefresh: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateGold: (amount: number) => void;
  updateExp: (amount: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authService.login(email, password);
          localStorage.setItem('token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email, password, displayName, role, classJoinCode) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authService.register({
            email,
            password,
            displayName,
            role,
            classJoinCode,
          });
          localStorage.setItem('token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setTokenAndRefresh: async (token: string) => {
        set({ isLoading: true, token });
        localStorage.setItem('token', token);
        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          localStorage.removeItem('token');
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });
        try {
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          // Token invalid, clear auth state
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          localStorage.removeItem('token');
        }
      },

      updateGold: (amount: number) => {
        const { user } = get();
        if (user?.studentProfile) {
          set({
            user: {
              ...user,
              studentProfile: {
                ...user.studentProfile,
                gold: user.studentProfile.gold + amount,
              },
            },
          });
        }
      },

      updateExp: (amount: number) => {
        const { user } = get();
        if (user?.studentProfile) {
          set({
            user: {
              ...user,
              studentProfile: {
                ...user.studentProfile,
                exp: user.studentProfile.exp + amount,
              },
            },
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export default useUserStore;
