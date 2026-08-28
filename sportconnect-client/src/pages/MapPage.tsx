import { useState, useRef, useCallback, useEffect } from 'react';
import { YMaps, Map, Placemark, Clusterer } from '@pbe/react-yandex-maps';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SportFilter from '../components/SportFilter';
import CreateMeetingModal from '../components/CreateMeetingModal';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import MeetingCard from '../components/MeetingCard';
import { useLocation } from 'react-router-dom';

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
  authorSkillLevel: number;
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
  const location = useLocation();
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const [tempMarker, setTempMarker] = useState<[number, number] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [meetings, setMeetings] = useState<MeetingMarker[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingDetail | null>(null);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const emptyStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([55.751574, 37.573856]);
  const mapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCenterRef = useRef<[number, number] | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const handleLogout = () => {
  logout();
  navigate('/');
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
  setLoadingMeetings(true);
  try {
    const res = await api.get(`/meetings/nearby?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`);
    setMeetings(res.data);
  } catch (error) {
    console.error('Ошибка загрузки встреч:', error);
    showToast('Не удалось загрузить встречи рядом', 'error');
  } finally {
    setLoadingMeetings(false);
  }
}, [showToast]);

  const handleBoundsChange = useCallback((e: any) => {
  const bounds = e.get('newBounds');
  if (!bounds) return;

  const center = e.get('newCenter');
  if (center) {
    setMapCenter([center[0], center[1]]);
    localStorage.setItem('mapCenter', JSON.stringify([center[0], center[1]]));
  }

  const minLat = bounds[0][0];
  const maxLat = bounds[1][0];
  const minLng = bounds[0][1];
  const maxLng = bounds[1][1];

  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    loadMeetings(minLat, maxLat, minLng, maxLng);
  }, 500);
  }, [loadMeetings]);

  const [citySearch, setCitySearch] = useState(() => {
  const saved = localStorage.getItem('lastCity');
  return saved || '';
  });
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  const handleCitySearch = async (value: string) => {
    setCitySearch(value);
    setSelectedSuggestionIndex(-1);
    if (value.length < 2) {
      setCitySuggestions([]);
      return;
    }

    try {
      const apiKey = import.meta.env.VITE_YANDEX_GEOCODER_API_KEY;
      const res = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(value)}&lang=ru_RU&kind=locality`
      );
      const data = await res.json();
      const items = data?.response?.GeoObjectCollection?.featureMember
        ?.map((item: any) => item.GeoObject.name)
        .filter((name: string, index: number, arr: string[]) => arr.indexOf(name) === index)
        .slice(0, 10);
      setCitySuggestions(items || []);
    } catch {
      setCitySuggestions([]);
    }
  };

  const handleCitySelect = async (cityName: string) => {
    setCitySearch(cityName);
    setCitySuggestions([]);
    localStorage.setItem('lastCity', cityName);

    try {
      const apiKey = import.meta.env.VITE_YANDEX_GEOCODER_API_KEY;
      const res = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(cityName)}&lang=ru_RU`
      );
      const data = await res.json();
      const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      if (pos) {
        const [lng, lat] = pos.split(' ').map(Number);
        setMapCenter([lat, lng]);
        localStorage.setItem('mapCenter', JSON.stringify([lat, lng]));
        pendingCenterRef.current = [lat, lng];

        if (mapRef.current) {
        mapRef.current.setCenter([lat, lng], 12);
        pendingCenterRef.current = null;
        }

        loadMeetings(lat - 0.01, lat + 0.01, lng - 0.01, lng + 0.01);
      }
    } catch {
      showToast('Не удалось найти город', 'error');
    }
  };

    const handleCityKeyDown = (e: React.KeyboardEvent) => {
      if (citySuggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < citySuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : citySuggestions.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleCitySelect(citySuggestions[selectedSuggestionIndex]);
        } else if (citySearch.trim()) {
          handleCitySelect(citySearch.trim());
        }
      } else if (e.key === 'Escape') {
        setCitySuggestions([]);
        setSelectedSuggestionIndex(-1);
      }
    };

  useEffect(() => {
  const loadUserCity = async () => {
    try {
      // Координаты из навигации (кнопка "Показать на карте")
      const navState = location.state as { lat?: number; lng?: number } | null;
      if (navState?.lat != null && navState?.lng != null) {
        const { lat, lng } = navState;
        setMapCenter([lat, lng]);
        pendingCenterRef.current = [lat, lng];
        if (mapRef.current) {
          mapRef.current.setCenter([lat, lng], 12);
          pendingCenterRef.current = null;
        }
        localStorage.setItem('mapCenter', JSON.stringify([lat, lng]));
        loadMeetings(lat - 0.01, lat + 0.01, lng - 0.01, lng + 0.01);
        return;
      }
      //город с главной стр
      const manualCity = localStorage.getItem('manualCity');
      if (manualCity) {
        localStorage.removeItem('manualCity');
        const apiKey = import.meta.env.VITE_YANDEX_GEOCODER_API_KEY;
        const geocodeRes = await fetch(
          `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(manualCity)}&lang=ru_RU`
        );
        const geocodeData = await geocodeRes.json();
        const pos = geocodeData?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
        if (pos) {
          const [lng, lat] = pos.split(' ').map(Number);
          setMapCenter([lat, lng]);
          pendingCenterRef.current = [lat, lng];
          loadMeetings(lat - 0.01, lat + 0.01, lng - 0.01, lng + 0.01);
          return;
        }
      }
      
      // Если есть сохраненный центр карты
      const saved = localStorage.getItem('mapCenter');
      if (saved) {
        const parsed = JSON.parse(saved);
        const lat = Array.isArray(parsed) ? parsed[0] : parsed.lat;
        const lng = Array.isArray(parsed) ? parsed[1] : parsed.lng;

        if (typeof lat === 'number' && typeof lng === 'number') {
          setMapCenter([lat, lng]);
          pendingCenterRef.current = [lat, lng];
          if (mapRef.current) {
            mapRef.current.setCenter([lat, lng], 12);
            pendingCenterRef.current = null;
          }
          loadMeetings(lat - 0.01, lat + 0.01, lng - 0.01, lng + 0.01);
          return;
        }
      }

      //город из профиля
      const profileRes = await api.get('/profile');
      const city = profileRes.data.city;
      if (city) {
        const apiKey = import.meta.env.VITE_YANDEX_GEOCODER_API_KEY;
        const geocodeRes = await fetch(
          `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(city)}&lang=ru_RU`
        );
        const geocodeData = await geocodeRes.json();
        const pos = geocodeData?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
        if (pos) {
            const [lng, lat] = pos.split(' ').map(Number);
            setMapCenter([lat, lng]);
            loadMeetings(lat - 0.01, lat + 0.01, lng - 0.01, lng + 0.01);
            return;
          }
      }

      loadMeetings(55.6, 55.8, 37.3, 37.7);
    } catch (error) {
      console.error('Ошибка определения города:', error);
      loadMeetings(55.6, 55.8, 37.3, 37.7);
    }
  };

  loadUserCity();
}, [location.pathname, location.state]);

useEffect(() => {
  if (emptyStateTimerRef.current) clearTimeout(emptyStateTimerRef.current);

  if (!loadingMeetings && meetings.length === 0) {
    emptyStateTimerRef.current = setTimeout(() => {
      setShowEmptyState(true);
    }, 400);
  } else {
    setShowEmptyState(false);
  }

  return () => {
    if (emptyStateTimerRef.current) clearTimeout(emptyStateTimerRef.current);
  };
}, [loadingMeetings, meetings.length]);

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

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) {
            mapRef.current.setCenter([latitude, longitude], 14);
          }
          loadMeetings(latitude - 0.01, latitude + 0.01, longitude - 0.01, longitude + 0.01);
        },
        () => {
          showToast('Не удалось получить местоположение', 'error');
        }
      );
    } else {
      showToast('Геолокация не поддерживается', 'error');
    }
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

    <input
      type="text"
      value={citySearch}
      placeholder="Введите город"
      onChange={(e) => handleCitySearch(e.target.value)}
      onKeyDown={handleCityKeyDown}
      style={{ padding: '6px 10px', marginRight: 8, width: 150 }}
    />

    {citySuggestions.length > 0 && (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: 4,
        maxHeight: 200,
        overflowY: 'auto',
        zIndex: 100,
      }}>
        {citySuggestions.map((s, index) => (
          <div
            key={s}
            onClick={() => handleCitySelect(s)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              background: index === selectedSuggestionIndex ? '#e3f2fd' : 'white',
            }}
            onMouseEnter={(e) => {
              setSelectedSuggestionIndex(index);
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = index === selectedSuggestionIndex ? '#e3f2fd' : 'white';
            }}
          >
            {s}
          </div>
        ))}
          </div>
        )}

    <button onClick={handleGeolocate} style={{ marginLeft: 10 }}>📍</button>
        {user ? (
          <>
            <span>{user.userName}</span>
            <button onClick={() => navigate('/profile')} style={{ marginLeft: 10, marginRight: 10 }}>Профиль</button>
            <button onClick={handleLogout} style={{ marginLeft: 10 }}>Выйти</button>
          </>
        ) : (
          <button onClick={() => navigate('/login')} style={{ marginLeft: 10 }}>Вход</button>
        )}
      </div>

      <SportFilter selected={selectedSports} onChange={setSelectedSports} />

      <YMaps query={{ apikey: import.meta.env.VITE_YANDEX_API_KEY }}>
      <Map
        defaultState={{ center: mapCenter, zoom: 12 }}
        width="100%"
        height="100%"
        onClick={handleMapClick}
        onBoundsChange={handleBoundsChange}
        instanceRef={(ref) => {
          mapRef.current = ref;
          if (ref && pendingCenterRef.current) {
            ref.setCenter(pendingCenterRef.current, 12);
            pendingCenterRef.current = null;
          }
        }}
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

      {loadingMeetings && (
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'white',
        padding: '8px 16px',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 200,
      }}>
        Загрузка встреч...
      </div>
    )}

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
        {showEmptyState && !showModal && (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: '24px',
        borderRadius: 12,
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
        zIndex: 150,
        textAlign: 'center',
        maxWidth: 300,
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏀</div>
        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Здесь пока нет встреч</p>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
          Нажмите по карту для создания первой встречи
        </p>
      </div>
    )}
    </div>
  );
}