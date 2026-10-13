import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole, AuthResponse } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<{ message: string; user_id: number; username: string; role: string }>;
  demoLogin: (role: UserRole, variant?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  token: null,
  login: async () => {},
  register: async () => ({ message: '', user_id: 0, username: '', role: '' }),
  demoLogin: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  loading: false,
  error: null,
  clearError: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('upv_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('upv_token'));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setError('Your session has expired. Please log in again.');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: AuthResponse = await authApi.login(username, password);
      localStorage.setItem('upv_token', res.access_token);
      const profile: UserProfile = {
        id: res.user_id,
        username: res.username,
        email: `${res.username}@hospital-system.org`,
        full_name: res.full_name,
        role: res.role,
        is_active: true,
        linked_patient_id: res.linked_patient_id,
        doctor_id: res.doctor_id,
      };
      localStorage.setItem('upv_user', JSON.stringify(profile));
      setToken(res.access_token);
      setUser(profile);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.register(data);
      return res;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role: UserRole | string, variant?: string) => {
    const demoAccounts: Record<string, { u: string; p: string }> = {
      receptionist: { u: 'receptionist', p: 'RecepPassword123!' },
      doctor: { u: 'doctor_mehta', p: 'DoctorPassword123!' },
      doctor_gupta: { u: 'doctor_gupta', p: 'DoctorPassword123!' },
      doctor_unassigned: { u: 'doctor_unassigned', p: 'DoctorPassword123!' },
      lab_technician: { u: 'lab_tech', p: 'LabPassword123!' },
      pharmacist: { u: 'pharmacist', p: 'PharmPassword123!' },
      cashier: { u: 'cashier', p: 'CashierPassword123!' },
      patient: { u: 'patient_ananya', p: 'PatientPassword123!' },
      patient_neha: { u: 'patient_neha', p: 'PatientPassword123!' },
      admin: { u: 'admin', p: 'AdminPassword123!' },
    };

    const targetKey = variant || role;
    const creds = demoAccounts[targetKey] || demoAccounts[role];
    if (creds) {
      await login(creds.u, creds.p);
    }
  };


  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // Ignore logout network errors
    } finally {
      localStorage.removeItem('upv_token');
      localStorage.removeItem('upv_user');
      setUser(null);
      setToken(null);
      setError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        demoLogin,
        logout,
        isAuthenticated: !!token && !!user,
        loading,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
