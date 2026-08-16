import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';

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

        setSports(sportsRes.data);

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

        // Конвертация UTC
        const localDate = new Date(m.scheduledAt);
        const offset = localDate.getTimezoneOffset() * 60000;
        const localISO = new Date(localDate.getTime() - offset).toISOString().slice(0, 19);
        setScheduledAt(localISO);
      } catch (err: any) {
        showToast('Не удалось загрузить данные встречи', 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [meetingId]);

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
      const message = err.response?.data?.message || 'Ошибка при сохранении';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1002,
      }}>
        <div style={{ background: 'white', padding: 24, borderRadius: 12 }}>
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1002,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        width: 420,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ marginTop: 0 }}>Редактировать встречу</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>Название *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={100}
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Вид спорта *</label>
            <select
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              required
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            >
              <option value="">Выберите вид спорта</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Время *</label>
            <input
            type="datetime-local"
            step="1"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Мин. участников</label>
              <input
                type="number"
                value={minParticipants}
                onChange={(e) => setMinParticipants(Number(e.target.value))}
                min={1}
                max={30}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Макс. участников</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                min={Math.max(1, currentParticipants)}
                max={30}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Уровень</label>
            <select
              value={requiredSkillLevel}
              onChange={(e) => setRequiredSkillLevel(Number(e.target.value))}
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            >
              <option value={0}>Любой</option>
              <option value={1}>Новичок</option>
              <option value={2}>Любитель</option>
              <option value={3}>Продвинутый</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Инвентарь (через запятую)</label>
            <input
              value={inventory}
              onChange={(e) => setInventory(e.target.value)}
              placeholder="Мяч, ракетки, вода"
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={onClose} disabled={saving}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}