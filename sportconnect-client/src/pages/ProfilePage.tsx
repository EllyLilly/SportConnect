import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';

interface Sport {
  id: string;
  name: string;
  color: string;
}

interface MeetingHistoryItem {
  id: string;
  title: string;
  sportName: string;
  sportColor: string;
  status: number;
  scheduledAt: string;
  participantsCount: number;
  maxParticipants: number;
  isReadOnly: boolean;
  latitude: number;
  longitude: number;
  resultLabel: string;
}

const skillLevels = [
  { value: 0, label: 'Любой' },
  { value: 1, label: 'Новичок' },
  { value: 2, label: 'Любитель' },
  { value: 3, label: 'Продвинутый' },
];

const statusLabels: Record<number, string> = {
  0: 'Идёт набор',
  1: 'Набрана',
  2: 'Началась',
  3: 'Завершена',
  4: 'Отменена',
};

export default function ProfilePage() {
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [radius, setRadius] = useState(3000);
  const [skillLevel, setSkillLevel] = useState(0);
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profile' | 'active' | 'history'>('profile');
  const [meetings, setMeetings] = useState<MeetingHistoryItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, sportsRes] = await Promise.all([
          api.get('/profile'),
          api.get('/sport'),
        ]);

        setCity(profileRes.data.city || '');
        setRadius(profileRes.data.radiusMeters);
        setSkillLevel(profileRes.data.skillLevel);
        setSelectedSportIds(profileRes.data.sportIds);
        setSports(sportsRes.data);
      } catch (err: any) {
        showToast('Ошибка загрузки профиля', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [showToast]);

  const loadMeetings = async (filter: 'active' | 'history') => {
    setMeetingsLoading(true);
    try {
      const response = await api.get(`/profile/meetings?filter=${filter}`);
      setMeetings(response.data);
    } catch (err: any) {
      showToast('Ошибка загрузки встреч', 'error');
    } finally {
      setMeetingsLoading(false);
    }
  };

  const handleTabChange = (newTab: 'profile' | 'active' | 'history') => {
    setTab(newTab);
    if (newTab === 'active') {
      loadMeetings('active');
    } else if (newTab === 'history') {
      loadMeetings('history');
    }
  };

  const toggleSport = (id: string) => {
    setSelectedSportIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCityInput = async (value: string) => {
    setCity(value);
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
      const suggestions = data?.response?.GeoObjectCollection?.featureMember
        ?.map((item: any) => item.GeoObject.name)
        .filter((name: string, index: number, arr: string[]) => arr.indexOf(name) === index)
        .slice(0, 10);
      setCitySuggestions(suggestions || []);
    } catch {
      setCitySuggestions([]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await api.put('/profile', {
        radiusMeters: radius,
        skillLevel,
        sportIds: selectedSportIds,
        city: city || null,
      });
      localStorage.removeItem('mapCenter');
      showToast('Профиль сохранён', 'success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Ошибка сохранения';
      showToast(message, 'error');
    }
  };

  const showOnMap = (meeting: MeetingHistoryItem) => {
  navigate('/map', {
    state: { lat: meeting.latitude, lng: meeting.longitude },
    });
  };

  if (loading) return <div>Загрузка профиля...</div>;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <h1>Профиль</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => handleTabChange('profile')}
          style={{
            padding: '8px 16px',
            background: tab === 'profile' ? '#4CAF50' : '#f5f5f5',
            color: tab === 'profile' ? 'white' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Настройки
        </button>
        <button
          onClick={() => handleTabChange('active')}
          style={{
            padding: '8px 16px',
            background: tab === 'active' ? '#4CAF50' : '#f5f5f5',
            color: tab === 'active' ? 'white' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Активные
        </button>
        <button
          onClick={() => handleTabChange('history')}
          style={{
            padding: '8px 16px',
            background: tab === 'history' ? '#4CAF50' : '#f5f5f5',
            color: tab === 'history' ? 'white' : '#333',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          История
        </button>
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20, position: 'relative' }}>
            <label>Город</label>
            <input
              type="text"
              value={city}
              onChange={(e) => handleCityInput(e.target.value)}
              placeholder="Начните вводить город"
              style={{ width: '100%', padding: '8px', marginTop: 4 }}
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
                {citySuggestions.map((s) => (
                  <div
                    key={s}
                    onClick={() => {
                      setCity(s);
                      setCitySuggestions([]);
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Радиус поиска: {(radius / 1000).toFixed(1)} км</label>
            <input
              type="range"
              min={500}
              max={20000}
              step={100}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Уровень подготовки</label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', marginTop: 4 }}
            >
              {skillLevels.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Интересы (не более 5)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 8 }}>
              {sports.map((sport) => (
                <span
                  key={sport.id}
                  onClick={() => toggleSport(sport.id)}
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    margin: '4px',
                    borderRadius: '20px',
                    backgroundColor: selectedSportIds.includes(sport.id)
                      ? sport.color
                      : '#eee',
                    color: selectedSportIds.includes(sport.id) ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontWeight: selectedSportIds.includes(sport.id)
                      ? 'bold'
                      : 'normal',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                  }}
                >
                  {sport.name}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ padding: '10px 20px' }}>
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => navigate('/map')}
              style={{ padding: '10px 20px' }}
            >
              Назад
            </button>
          </div>
        </form>
      )}

      {tab !== 'profile' && (
        <div>
          <h2>{tab === 'active' ? 'Активные встречи' : 'История встреч'}</h2>

          {meetingsLoading ? (
            <p>Загрузка встреч...</p>
          ) : meetings.length === 0 ? (
            <p>Нет встреч</p>
          ) : (
            meetings.map((meeting) => (
              <div
                key={meeting.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  background: meeting.isReadOnly ? '#f9f9f9' : 'white',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{meeting.title}</strong>
                  <span style={{
                    background: meeting.sportColor,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                  }}>
                    {meeting.sportName}
                  </span>
                </div>

                <p style={{ margin: '4px 0' }}>
                  {statusLabels[meeting.status]} · {meeting.scheduledAt}
                </p>
                <p style={{ margin: '4px 0' }}>
                  {meeting.participantsCount}/{meeting.maxParticipants} участников
                </p>

                {meeting.resultLabel && (
                  <p style={{ margin: '4px 0', fontWeight: 'bold' }}>
                    {meeting.resultLabel}
                  </p>
                )}

                <button
                  onClick={() => showOnMap(meeting)}
                  style={{
                    padding: '8px 12px',
                    marginTop: 8,
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Показать на карте
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}