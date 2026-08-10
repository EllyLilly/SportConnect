import { useState, useRef, useCallback } from 'react';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SportFilter from '../components/SportFilter';
import CreateMeetingModal from '../components/CreateMeetingModal';

export default function MapPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const mapRef = useRef<any>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMapClick = useCallback((e: any) => {
    const coords = e.get('coords');
    setTempMarker(coords);
    setShowModal(true);
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    setTempMarker(null);
  };

  const handleMeetingCreated = () => {
    // обновление маркеров
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
          onClick={handleMapClick}
          instanceRef={mapRef}
        >
          {tempMarker && (
            <Placemark
              geometry={tempMarker}
              properties={{
                balloonContent: 'Новая встреча',
                iconCaption: 'Новая встреча',
              }}
              options={{
                preset: 'islands#blueIcon',
              }}
            />
          )}
        </Map>
      </YMaps>

      {showModal && tempMarker && (
        <CreateMeetingModal
          lat={tempMarker[0]}
          lng={tempMarker[1]}
          onClose={handleCloseModal}
          onCreated={handleMeetingCreated}
        />
      )}
    </div>
  );
}