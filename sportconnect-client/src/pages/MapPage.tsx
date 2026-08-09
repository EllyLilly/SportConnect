import { useState } from 'react';
import { YMaps, Map } from '@pbe/react-yandex-maps';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SportFilter from '../components/SportFilter';

export default function MapPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 100,
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <span>{user?.userName}</span>
        <button onClick={() => navigate('/profile')} style={{ marginLeft: 10, marginRight: 10 }}>Профиль</button>
        <button onClick={handleLogout} style={{ marginLeft: 10 }}>Выйти</button>
      </div>

      <SportFilter selected={selectedSports} onChange={setSelectedSports} />

      <YMaps query={{ apikey: import.meta.env.VITE_YANDEX_API_KEY }}>
        <Map
          defaultState={{ center: [55.751574, 37.573856], zoom: 12 }}
          width="100%"
          height="100%"
        />
      </YMaps>
    </div>
  );
}