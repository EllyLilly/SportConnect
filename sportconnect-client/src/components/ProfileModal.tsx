import { useState, useEffect, type FormEvent } from 'react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import '../styles/modal.css';

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

interface ProfileModalProps {
  onClose: () => void;
  onNavigateToMeeting: (lat: number, lng: number) => void;
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

export default function ProfileModal({ onClose, onNavigateToMeeting }: ProfileModalProps) {
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [radius, setRadius] = useState(3000);
  const [skillLevel, setSkillLevel] = useState(0);
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'active' | 'history'>('profile');
  const [meetings, setMeetings] = useState<MeetingHistoryItem[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');
  const [telegramExpiresAt, setTelegramExpiresAt] = useState('');
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramTimer, setTelegramTimer] = useState<number | null>(null);
  const { showToast } = useToast();

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
        setSelectedSportIds(profileRes.data.sportIds || []);
        setSports(Array.isArray(sportsRes.data) ? sportsRes.data : []);

        try {
          const telegramRes = await api.get('/profile/telegram/status');
          setTelegramConnected(telegramRes.data.isConnected);
        } catch {
          // telegram not connected
        }
      } catch (err: any) {
        showToast('Ошибка загрузки профиля', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [showToast]);

  useEffect(() => {
    return () => {
      if (telegramTimer) clearInterval(telegramTimer);
    };
  }, [telegramTimer]);

  const loadMeetings = async (filter: 'active' | 'history') => {
    setMeetingsLoading(true);
    try {
      const response = await api.get(`/profile/meetings?filter=${filter}`);
      setMeetings(Array.isArray(response.data) ? response.data : []);
    } catch {
      showToast('Ошибка загрузки встреч', 'error');
    } finally {
      setMeetingsLoading(false);
    }
  };

  const handleTabChange = (newTab: 'profile' | 'active' | 'history') => {
    setTab(newTab);
    if (newTab === 'active') loadMeetings('active');
    if (newTab === 'history') loadMeetings('history');
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
    setSaving(true);

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
      showToast(getErrorMessage(err, 'Ошибка сохранения'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateCode = async () => {
    setTelegramLoading(true);
    try {
      const res = await api.post('/profile/telegram/generate-code');
      setTelegramCode(res.data.code);
      setTelegramExpiresAt(res.data.expiresAt);

      if (telegramTimer) clearInterval(telegramTimer);
      const timer = setInterval(() => {
        const expires = new Date(res.data.expiresAt).getTime();
        if (Date.now() >= expires) {
          setTelegramCode('');
          setTelegramExpiresAt('');
          clearInterval(timer);
        }
      }, 1000);
      setTelegramTimer(timer);

      showToast('Код сгенерирован', 'success');
    } catch {
      showToast('Ошибка генерации кода', 'error');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    setTelegramLoading(true);
    try {
      await api.delete('/profile/telegram');
      setTelegramConnected(false);
      showToast('Telegram отключён', 'success');
    } catch {
      showToast('Ошибка отключения', 'error');
    } finally {
      setTelegramLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">Профиль</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className="modal-btn-secondary"
            style={{ flex: 1, padding: '8px 12px' }}
            onClick={() => handleTabChange('profile')}
            disabled={tab === 'profile'}
          >
            Настройки
          </button>
          <button
            type="button"
            className="modal-btn-secondary"
            style={{ flex: 1, padding: '8px 12px' }}
            onClick={() => handleTabChange('active')}
            disabled={tab === 'active'}
          >
            Активные
          </button>
          <button
            type="button"
            className="modal-btn-secondary"
            style={{ flex: 1, padding: '8px 12px' }}
            onClick={() => handleTabChange('history')}
            disabled={tab === 'history'}
          >
            История
          </button>
        </div>

        {loading ? (
          <p className="modal-hint">Загрузка профиля...</p>
        ) : tab === 'profile' ? (
          <form onSubmit={handleSubmit}>
            <div className="modal-form-group" style={{ position: 'relative' }}>
              <label className="modal-label">Город</label>
              <input
                type="text"
                className="modal-input"
                value={city}
                onChange={(e) => handleCityInput(e.target.value)}
                placeholder="Начните вводить город"
              />
              {citySuggestions.length > 0 && (
                <div className="topbar-suggestions">
                  {citySuggestions.map((s) => (
                    <div
                      key={s}
                      className="topbar-suggestion"
                      onClick={() => {
                        setCity(s);
                        setCitySuggestions([]);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Радиус поиска: {(radius / 1000).toFixed(1)} км</label>
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

            <div className="modal-form-group">
              <label className="modal-label">Уровень подготовки</label>
              <select
                className="modal-input"
                value={skillLevel}
                onChange={(e) => setSkillLevel(Number(e.target.value))}
              >
                {skillLevels.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
                ))}
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Интересы</label>
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
                        : 'rgba(255,255,255,0.05)',
                      color: selectedSportIds.includes(sport.id) ? '#001427' : '#f4d58d',
                      cursor: 'pointer',
                      fontWeight: selectedSportIds.includes(sport.id) ? 'bold' : 'normal',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                      border: '1px solid rgba(244, 213, 141, 0.3)',
                    }}
                  >
                    {sport.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-form-group" style={{ padding: 16, border: '1px solid rgba(244, 213, 141, 0.2)', borderRadius: 8 }}>
              <label className="modal-label" style={{ marginTop: 0 }}>Telegram-уведомления</label>

              {telegramConnected ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ color: '#708d81', fontWeight: 'bold', fontSize: 13, margin: 0 }}>✅ Подключено</p>
                        <button
                        type="button"
                        className="modal-btn"
                        style={{ flex: 'none', minWidth: 'auto', padding: '8px 20px', fontSize: 13 }}
                        onClick={handleDisconnectTelegram}
                        disabled={telegramLoading}
                        >
                        {telegramLoading ? '...' : 'Отключить'}
                        </button>
                    </div>
                    ) : (
                <div>
                  <p style={{ fontSize: 13, marginBottom: 8 }}>
                    1. Найди бота <strong>@SportConnectBot</strong> в Telegram<br />
                    2. Отправь <code>/connect &lt;код&gt;</code>
                  </p>
                  {telegramCode ? (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: '4px', margin: '8px 0' }}>
                        {telegramCode}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(244,213,141,0.7)' }}>
                        Код действует до: {new Date(telegramExpiresAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="modal-btn"
                      onClick={handleGenerateCode}
                      disabled={telegramLoading}
                    >
                      {telegramLoading ? 'Генерация...' : 'Сгенерировать код'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button type="submit" className="modal-btn" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" className="modal-btn-secondary" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h3 className="modal-label" style={{ fontSize: 16, marginBottom: 12 }}>
              {tab === 'active' ? 'Активные встречи' : 'История встреч'}
            </h3>

            {meetingsLoading ? (
              <p className="modal-hint">Загрузка...</p>
            ) : meetings.length === 0 ? (
              <p className="modal-hint">Нет встреч</p>
            ) : (
              meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  style={{
                    border: '1px solid rgba(244, 213, 141, 0.2)',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>{meeting.title}</strong>
                    <span style={{
                      background: meeting.sportColor,
                      color: '#001427',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {meeting.sportName}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, margin: '4px 0' }}>
                    {statusLabels[meeting.status]} · {meeting.scheduledAt}
                  </p>
                  <p style={{ fontSize: 12, margin: '4px 0' }}>
                    {meeting.participantsCount}/{meeting.maxParticipants} участников
                  </p>
                  <button
                    type="button"
                    className="modal-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12, marginTop: 8 }}
                    onClick={() => {
                      onClose();
                      onNavigateToMeeting(meeting.latitude, meeting.longitude);
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
    </div>
  );
}