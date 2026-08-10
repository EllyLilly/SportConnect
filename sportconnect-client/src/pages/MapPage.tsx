import { useState, useRef, useCallback, useEffect } from 'react';
import { YMaps, Map, Placemark, Clusterer } from '@pbe/react-yandex-maps';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SportFilter from '../components/SportFilter';
import CreateMeetingModal from '../components/CreateMeetingModal';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';

interface MeetingMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  sportColor: string;
  sportName: string;
  participantsCount: number;
  maxParticipants: number;
  scheduledAt: string;
  status: number;
}

export default function MapPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [meetings, setMeetings] = useState<MeetingMarker[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([55.751574, 37.573856]);
  const mapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

const loadMeetings = useCallback(async (lat: number, lng: number) => {
  try {
    const res = await api.get(`/meetings/nearby?lat=${lat}&lng=${lng}`);
    setMeetings(res.data);
  } catch (error) {
    console.error('Ошибка загрузки встреч:', error);
    showToast('Не удалось загрузить встречи рядом. Попробуйте обновить карту.', 'error');
  }
}, [showToast]);

  const handleBoundsChange = useCallback((e: any) => {
    const center = e.get('newCenter');
    const newCenter: [number, number] = [center[0], center[1]];
    setMapCenter(newCenter);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadMeetings(newCenter[0], newCenter[1]);
    }, 500);
  }, [loadMeetings]);

  useEffect(() => {
    loadMeetings(mapCenter[0], mapCenter[1]);
  }, []);

  const handleMeetingCreated = () => {
    loadMeetings(mapCenter[0], mapCenter[1]);
  };

  const getPresetByColor = (color: string) => {
    const colorMap: Record<string, string> = {
      '#4CAF50': 'islands#greenIcon',
      '#2196F3': 'islands#blueIcon',
      '#FF9800': 'islands#orangeIcon',
      '#9C27B0': 'islands#violetIcon',
      '#00BCD4': 'islands#cyanIcon',
      '#FF5722': 'islands#redIcon',
      '#E91E63': 'islands#pinkIcon',
      '#795548': 'islands#brownIcon',
    };
    return colorMap[color] || 'islands#blueIcon';
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
          defaultState={{ center: mapCenter, zoom: 12 }}
          width="100%"
          height="100%"
          onClick={handleMapClick}
          onBoundsChange={handleBoundsChange}
          instanceRef={mapRef}
        >
          <Clusterer
            options={{
              preset: 'islands#invertedVClusterIcons',
              groupByCoordinates: false,
            }}
          >
            {meetings.map((m) => (
                <Placemark
                  key={m.id}
                  geometry={[m.latitude, m.longitude]}
                  properties={{
                    iconCaption: `${m.participantsCount}/${m.maxParticipants}`,
                  }}
                  options={{
                    preset: getPresetByColor(m.sportColor),
                  }}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    // здесь будет открытие карточки встречи
                  }}
                />
              ))}
          </Clusterer>

          {tempMarker && (
            <Placemark
              geometry={tempMarker}
              properties={{
                balloonContent: 'Новая встреча',
              }}
              options={{
                preset: 'islands#darkBlueIcon',
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