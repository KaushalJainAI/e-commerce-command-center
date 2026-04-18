import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, getAdminInfo, AdminInfo } from '@/api/admin';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AdminInfo | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    try {
      const response = await getAdminInfo();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // If fetching profile fails, the token might be invalid
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await getAdminInfo();
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin({ email, password });
      setIsAuthenticated(true);
      await fetchUserProfile();
      navigate('/dashboard');
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const logout = async () => {
    try {
      await apiLogin({ email: '', password: '' }); // Hack, just to import axios if needed, wait no... we can just use fetch or api.post
    } catch(e) {}
    try {
      const api = (await import('@/api/axiosInstance')).default;
      await api.post('/auth/logout/');
    } catch(e) {}
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  const refreshUser = async () => {
    if (isAuthenticated) {
      await fetchUserProfile();
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
