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
      const token = localStorage.getItem('admin_token');
      if (token) {
        setIsAuthenticated(true);
        await fetchUserProfile();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin({ email, password });
      localStorage.setItem('admin_token', response.data.access);
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }
      setIsAuthenticated(true);
      await fetchUserProfile();
      navigate('/dashboard');
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('refresh_token');
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
