import { useState, useEffect, type FormEvent } from 'react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';

interface Sport {
  id: string;
  name: string;
}

interface CreateMeetingModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onCreated: (lat: number, lng: number) => void;
}

export default function CreateMeetingModal({ lat, lng, onClose, onCreated }: CreateMeetingModalProps) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportId, setSportId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [minParticipants, setMinParticipants] = useState(2);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [skillLevel, setSkillLevel] = useState('0');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    api.get('/sport').then((res) => {
      setSports(res.data);
      if (res.data.length > 0) setSportId(res.data[0].id);
    });

    // Геокодирование — получение адреса по координатам
    const apiKey = import.meta.env.VITE_YANDEX_GEOCODER_API_KEY;
    fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${lng},${lat}&lang=ru_RU`)
      .then((res) => res.json())
      .then((data) => {
        const geoObjects = data?.response?.GeoObjectCollection?.featureMember;
        if (geoObjects && geoObjects.length > 0) {
          setAddress(geoObjects[0].GeoObject.metaDataProperty.GeocoderMetaData.text);
        }
      })
      .catch(() => {});
  }, [lat, lng]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const localDate = new Date(scheduledAt);
    const utcDate = localDate.toISOString();

    try {
      await api.post('/meetings', {
        sportId,
        title,
        description: description || null,
        latitude: lat,
        longitude: lng,
        address: address || null,
        scheduledAt: utcDate,
        minParticipants,
        maxParticipants,
        requiredSkillLevel: Number(skillLevel),
        inventory: null,
      });

      showToast('Встреча создана', 'success');
      onCreated(lat, lng);
      onClose();
    } catch (err: any) {
      showToast(getErrorMessage(err, 'Ошибка создания встречи'), 'error');
  } finally {
      setLoading(false);
  }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 24,
        maxWidth: 420, width: '90%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2>Создать встречу</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label>Вид спорта</label>
            <select value={sportId} onChange={(e) => setSportId(e.target.value)}>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Заголовок</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={100} />
          </div>

          <div>
            <label>Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>

          <div>
            <label>Дата и время</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
          </div>

          <div>
            <label>Адрес</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div>
            <label>Мин. участников</label>
            <input type="number" value={minParticipants} onChange={(e) => setMinParticipants(Number(e.target.value))} min={1} max={30} />
          </div>

          <div>
            <label>Макс. участников</label>
            <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} min={1} max={30} />
          </div>

          <div>
            <label>Уровень подготовки</label>
            <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
              <option value="0">Любой</option>
              <option value="1">Новичок</option>
              <option value="2">Любитель</option>
              <option value="3">Продвинутый</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
            <button type="button" onClick={onClose} disabled={loading}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}