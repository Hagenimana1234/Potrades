import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  wallets?: any[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const getStoredAuth = () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');

  if (accessToken && refreshToken && userStr) {
    return {
      accessToken,
      refreshToken,
      user: JSON.parse(userStr),
      isAuthenticated: true,
    };
  }

  return {
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getStoredAuth(),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
