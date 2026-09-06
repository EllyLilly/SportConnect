import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import '../styles/modal.css';

interface Sport {
  id: string;
  name: string;
  color: string;
}

interface EditMeetingModalProps {
  meetingId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditMeetingModal({ meetingId, onClose, onUpdated }: EditMeetingModalProps) {
  const { showToast } = useToast();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportId, setSportId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [minParticipants, setMinParticipants] = useState(2);
  const [requiredSkillLevel, setRequiredSkillLevel] = useState(0);
  const [inventory, setInventory] = useState('');
  const [currentParticipants, setCurrentParticipants] = useState(0);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sportsRes, meetingRes] = await Promise.all([
          api.get('/sport'),
          api.get(`/meetings/${meetingId}`),
        ]);

        setSports(Array.isArray(sportsRes.data) ? sportsRes.data : []);

        const m = meetingRes.data;
        setTitle(m.title);
        setDescription(m.description || '');
        setSportId(m.sportId);
        setMinParticipants(m.minParticipants);
        setMaxParticipants(m.maxParticipants);
        setRequiredSkillLevel(m.requiredSkillLevel);
        setInventory(m.inventory ? m.inventory.join(', ') : '');
        setCurrentParticipants(m.participantsCount);
        setLatitude(m.latitude);
        setLongitude(m.longitude);

        const localDate = new Date(m.scheduledAt);
        const offset = localDate.getTimezoneOffset() * 60000;
        const localISO = new Date(localDate.getTime() - offset).toISOString().slice(0, 19);
        setScheduledAt(localISO);
      } catch {
        showToast('Не удалось загрузить данные встречи', 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [meetingId, showToast, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (maxParticipants < currentParticipants) {
      showToast(`Максимум участников не может быть меньше ${currentParticipants}`, 'error');
      return;
    }

    const inventoryArray = inventory
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const payload = {
      title,
      description: description || null,
      sportId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      minParticipants,
      maxParticipants,
      requiredSkillLevel,
      inventory: inventoryArray.length > 0 ? inventoryArray : null,
      latitude,
      longitude,
    };

    setSaving(true);
    try {
      await api.put(`/meetings/${meetingId}`, payload);
      showToast('Встреча обновлена', 'success');
      onUpdated();
      onClose();
    } catch (err: any) {
      showToast(getErrorMessage(err, 'Ошибка при сохранении'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <p className="modal-hint">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">Редактировать встречу</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-form-group">
            <label className="modal-label">Название *</label>
            <input
              className="modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={100}
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
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Вид спорта *</label>
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
            <label className="modal-label">Время *</label>
            <input
              type="datetime-local"
              step="1"
              className="modal-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
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
                min={Math.max(1, currentParticipants)}
                max={30}
              />
            </div>
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Уровень</label>
            <select
              className="modal-input"
              value={requiredSkillLevel}
              onChange={(e) => setRequiredSkillLevel(Number(e.target.value))}
            >
              <option value={0}>Любой</option>
              <option value={1}>Новичок</option>
              <option value={2}>Любитель</option>
              <option value={3}>Продвинутый</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Инвентарь (через запятую)</label>
            <input
              className="modal-input"
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
              placeholder="Мяч, ракетки, вода"
            />
          </div>

          <div className="modal-buttons">
            <button type="submit" className="modal-btn" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" className="modal-btn-secondary" onClick={onClose} disabled={saving}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}