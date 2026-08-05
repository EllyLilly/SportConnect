import { createContext, useContext, useState, type ReactNode } from 'react';
import api from '../api/axios';

interface User {
  userName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, userName, email: userEmail } = response.data;
    localStorage.setItem('accessToken', accessToken);
    setUser({ userName, email: userEmail });
  };

  const register = async (userName: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { userName, email, password });
    const { accessToken, userName: name, email: userEmail } = response.data;
    localStorage.setItem('accessToken', accessToken);
    setUser({ userName: name, email: userEmail });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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