import { useState, useEffect, type FormEvent } from 'react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import '../styles/modal.css';

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
      const data = Array.isArray(res.data) ? res.data : [];
      setSports(data);
      if (data.length > 0) setSportId(data[0].id);
    });

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">Создать встречу</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-form-group">
            <label className="modal-label">Вид спорта</label>
            <select
              className="modal-input"
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              required
            >
              <option value="">Выберите вид спорта</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Заголовок</label>
            <input
              className="modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={100}
              placeholder="Например: Футбол 5х5"
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Описание</label>
            <textarea
              className="modal-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Что взять с собой, особенности места..."
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Дата и время</label>
            <input
              type="datetime-local"
              className="modal-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Адрес</label>
            <input
              className="modal-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Адрес встречи"
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="modal-form-group" style={{ flex: 1 }}>
              <label className="modal-label">Мин. участников</label>
              <input
                type="number"
                className="modal-input"
                value={minParticipants}
                onChange={(e) => setMinParticipants(Number(e.target.value))}
                min={1}
                max={30}
              />
            </div>
            <div className="modal-form-group" style={{ flex: 1 }}>
              <label className="modal-label">Макс. участников</label>
              <input
                type="number"
                className="modal-input"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                min={1}
                max={30}
              />
            </div>
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Уровень подготовки</label>
            <select
              className="modal-input"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
            >
              <option value="0">Любой</option>
              <option value="1">Новичок</option>
              <option value="2">Любитель</option>
              <option value="3">Продвинутый</option>
            </select>
          </div>

          <div className="modal-buttons">
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}