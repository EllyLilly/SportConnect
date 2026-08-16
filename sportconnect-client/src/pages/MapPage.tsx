import { useState, useRef, useCallback, useEffect } from 'react';
import { YMaps, Map, Placemark, Clusterer } from '@pbe/react-yandex-maps';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SportFilter from '../components/SportFilter';
import CreateMeetingModal from '../components/CreateMeetingModal';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import MeetingCard from '../components/MeetingCard';

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

interface MeetingDetail {
  id: string;
  title: string;
  sportName: string;
  sportColor: string;
  authorId: string;
  authorName: string;
  scheduledAt: string;
  address: string | null;
  description: string | null;
  participantsCount: number;
  maxParticipants: number;
  status: number;
  requiredSkillLevel: number;
  inventory: string[] | null;
  participants: Array<{ userId: string; userName: string; joinedAt: string }>;
  canEdit: boolean;
  canJoin: boolean;
  canLeave: boolean;
}

export default function MapPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [meetings, setMeetings] = useState<MeetingMarker[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetail | null>(null);
  const [mapCenter] = useState<[number, number]>([55.751574, 37.573856]);
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

  const loadMeetings = useCallback(async (minLat: number, maxLat: number, minLng: number, maxLng: number) => {
  try {
    const res = await api.get(`/meetings/nearby?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`);
    setMeetings(res.data);
  } catch (error) {
    console.error('Ошибка загрузки встреч:', error);
    showToast('Не удалось загрузить встречи рядом', 'error');
  }
  }, [showToast]);

  const handleBoundsChange = useCallback((e: any) => {
  const bounds = e.get('newBounds');
  if (!bounds) return;

  const minLat = bounds[0][0];
  const maxLat = bounds[1][0];
  const minLng = bounds[0][1];
  const maxLng = bounds[1][1];

  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    loadMeetings(minLat, maxLat, minLng, maxLng);
  }, 500);
  }, [loadMeetings]);

  useEffect(() => {
  loadMeetings(55.6, 55.8, 37.3, 37.7);
  }, []);

 const handleMeetingCreated = (lat: number, lng: number) => {
  loadMeetings(lat - 0.01, lat + 0.01, lng - 0.01, lng + 0.01);
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

  const loadMeetingDetail = async (id: string) => {
    try {
      const res = await api.get(`/meetings/${id}`);
      setSelectedMeeting(res.data);
    } catch (err: any) {
      showToast('Не удалось загрузить встречу', 'error');
    }
  };

  console.log('YANDEX API KEY:', import.meta.env.VITE_YANDEX_API_KEY);
  console.log('GEOCODER API KEY:', import.meta.env.VITE_YANDEX_GEOCODER_API_KEY);

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
                  loadMeetingDetail(m.id);
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

      {selectedMeeting && (
        <MeetingCard
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onUpdate={() => {
          loadMeetings(mapCenter[0] - 0.01, mapCenter[0] + 0.01, mapCenter[1] - 0.01, mapCenter[1] + 0.01);
          loadMeetingDetail(selectedMeeting.id);
        }}
        />
      )}
    </div>
  );
}