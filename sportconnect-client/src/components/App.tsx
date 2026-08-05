import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import MapPage from '../pages/MapPage';
import { ToastProvider } from '../contexts/ToastContext';
import ErrorBoundary from '../components/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/" element={<LoginPage />} />
        </Routes>
        </ToastProvider>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}