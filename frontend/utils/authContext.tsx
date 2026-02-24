import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTHORIZED_EMAILS } from './constants';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = '@badhotel_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authData = await AsyncStorage.getItem(AUTH_KEY);
      if (authData) {
        const { email, timestamp } = JSON.parse(authData);
        // Session valid for 7 days
        const isValid = Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000;
        if (isValid && AUTHORIZED_EMAILS.includes(email.toLowerCase())) {
          setIsAuthenticated(true);
          setUserEmail(email);
        } else {
          await AsyncStorage.removeItem(AUTH_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email is in whitelist
    if (!AUTHORIZED_EMAILS.includes(normalizedEmail)) {
      return false;
    }
    
    // Simple password validation (in production, use proper auth)
    // For now, accept any password for whitelisted emails
    if (password.length < 4) {
      return false;
    }
    
    try {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({
        email: normalizedEmail,
        timestamp: Date.now()
      }));
      setIsAuthenticated(true);
      setUserEmail(normalizedEmail);
      return true;
    } catch (error) {
      console.error('Error saving auth:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      setIsAuthenticated(false);
      setUserEmail(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
