import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserRole>;
  loginWithOtp: (email: string, otp: string) => Promise<UserRole>;
  register: (data: any) => Promise<UserRole>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('classably_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auto-login check on boot with fast safety fallback
  useEffect(() => {
    let isMounted = true;

    // Fast safety fallback: prevent any mobile/network freeze over 1.5s
    const safetyTimeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 1500);

    const fetchUser = async () => {
      const storedToken = localStorage.getItem('classably_token');
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        clearTimeout(safetyTimeout);
        return;
      }
      try {
        const response = await authApi.getMe();
        if (isMounted) setUser(response.data);
      } catch (err) {
        console.error('Auto-login failed, clearing session:', err);
        localStorage.removeItem('classably_token');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserRole> => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      const { access_token, user: loggedUser } = response.data;

      localStorage.setItem('classably_token', access_token);
      setToken(access_token);
      setUser(loggedUser);

      return loggedUser.role as UserRole;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (email: string, otp: string): Promise<UserRole> => {
    setIsLoading(true);
    try {
      const response = await authApi.loginWithOtp(email, otp);
      const { access_token, user: loggedUser } = response.data;

      localStorage.setItem('classably_token', access_token);
      setToken(access_token);
      setUser(loggedUser);

      return loggedUser.role as UserRole;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any): Promise<UserRole> => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);
      const { access_token, user: registeredUser } = response.data;

      localStorage.setItem('classably_token', access_token);
      setToken(access_token);
      setUser(registeredUser);

      return registeredUser.role as UserRole;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('classably_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginWithOtp,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
