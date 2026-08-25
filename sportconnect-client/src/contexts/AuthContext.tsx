import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';

interface User {
  userName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);

  // Проверка токена при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (!storedToken) {
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser({ userName: response.data.userName, email: response.data.email });
        setToken(storedToken);
      } catch {
        localStorage.removeItem('accessToken');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, userName, email: userEmail } = response.data;
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser({ userName, email: userEmail });
  };

  const register = async (userName: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { userName, email, password });
    const { accessToken, userName: name, email: userEmail } = response.data;
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser({ userName: name, email: userEmail });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  console.log('AuthProvider render:', {
  loading,
  hasToken: !!token,
  hasUser: !!user,
  stored: !!localStorage.getItem('accessToken'),
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}