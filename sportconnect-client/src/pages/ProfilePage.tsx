import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';

interface Sport {
  id: string;
  name: string;
  color: string;
}

const skillLevels = [
  { value: 'Any', label: 'Любой' },
  { value: 'Beginner', label: 'Новичок' },
  { value: 'Amateur', label: 'Любитель' },
  { value: 'Advanced', label: 'Продвинутый' },
];

export default function ProfilePage() {
  const [radius, setRadius] = useState(3000);
  const [skillLevel, setSkillLevel] = useState('Any');
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, sportsRes] = await Promise.all([
          api.get('/profile'),
          api.get('/sport'),
        ]);

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

  const toggleSport = (id: string) => {
    setSelectedSportIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await api.put('/profile', {
        radiusMeters: radius,
        skillLevel,
        sportIds: selectedSportIds,
      });
      showToast('Профиль сохранён', 'success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Ошибка сохранения';
      showToast(message, 'error');
    }
  };

  if (loading) return <div>Загрузка профиля...</div>;

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 20px' }}>
      <h1>Профиль</h1>

      <form onSubmit={handleSubmit}>
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
            onChange={(e) => setSkillLevel(e.target.value)}
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
    </div>
  );
}