import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import EditMeetingModal from './EditMeetingModal';
import { getErrorMessage } from '../utils/errorMessage';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useNavigate } from 'react-router-dom';
import './MeetingCard.css';

interface Participant {
  userId: string;
  userName: string;
  joinedAt: string;
}

interface MeetingCardProps {
  meeting: {
    id: string;
    title: string;
    sportName: string;
    sportColor: string;
    authorName: string;
    authorSkillLevel: number;
    authorId: string;
    scheduledAt: string;
    address: string | null;
    description: string | null;
    participantsCount: number;
    maxParticipants: number;
    status: number;
    requiredSkillLevel: number;
    inventory: string[] | null;
    participants: Participant[];
    canEdit: boolean;
    canJoin: boolean;
    canLeave: boolean;
  };
  onClose: () => void;
  onUpdate: () => void;
}

const statusLabels: Record<number, string> = {
  0: 'Идёт набор',
  1: 'Набрана',
  2: 'Началась',
  3: 'Завершена',
  4: 'Отменена',
};

const skillLabels: Record<number, string> = {
  0: 'Любой',
  1: 'Новичок',
  2: 'Любитель',
  3: 'Продвинутый',
};

export default function MeetingCard({ meeting, onClose, onUpdate }: MeetingCardProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();

  const canEdit = meeting.canEdit;
  const canJoin = meeting.canJoin;
  const canLeave = meeting.canLeave;

  const handleJoin = async () => {
    if (!isAuthenticated) {
      showToast('Войдите, чтобы присоединиться', 'error');
      return;
    }

    if (joining) return;

    setJoining(true);
    try {
      await api.post(`/meetings/${meeting.id}/join`);
      showToast('Вы присоединились к встрече', 'success');
      onUpdate();
    } catch (err: any) {
      const status = err.response?.status;
      const message = getErrorMessage(err, 'Ошибка');

      if (status === 409) {
        showToast('К сожалению, место только что заняли', 'error');
      } else {
        showToast(message, 'error');
      }
      
      onUpdate();
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await api.post(`/meetings/${meeting.id}/leave`);
      showToast('Вы вышли из встречи', 'success');
      onUpdate();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Ошибка';
      showToast(message, 'error');
    } finally {
      setLeaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Отменить встречу? Это действие нельзя отменить.')) {
      return;
    }

    try {
      await api.post(`/meetings/${meeting.id}/cancel`);
      showToast('Встреча отменена', 'success');
      onUpdate();
      onClose();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Ошибка';
      showToast(message, 'error');
    }
  };

  const progress = meeting.maxParticipants > 0
    ? (meeting.participantsCount / meeting.maxParticipants) * 100
    : 0;

  const canShowGuestButton = !isAuthenticated && (meeting.status === 0 || meeting.status === 1);

  return (
    <div className="meeting-card">
      <button onClick={onClose} style={{ float: 'right' }}>✕</button>

      {canEdit && (
        <button
          onClick={() => setShowEditModal(true)}
          style={{ float: 'right', marginRight: 8 }}
        >
          Редактировать
        </button>
      )}

      {canEdit && (
        <button
          onClick={handleCancel}
          style={{
            float: 'right',
            marginRight: 8,
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Отменить
        </button>
      )}

      <span style={{
        background: meeting.sportColor,
        color: 'white',
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 13,
      }}>
        {meeting.sportName}
      </span>

      <h2 style={{ marginTop: 12 }}>{meeting.title}</h2>

      <p><strong>Автор:</strong> {meeting.authorName}</p>
      <p><strong>Время:</strong> {formatRelativeTime(meeting.scheduledAt)}</p>
      {meeting.address && <p><strong>Место:</strong> {meeting.address}</p>}
      {meeting.description && <p><strong>Описание:</strong> {meeting.description}</p>}
      <p><strong>Уровень:</strong> {skillLabels[meeting.requiredSkillLevel]}</p>
      <p><strong>Уровень автора:</strong> {skillLabels[meeting.authorSkillLevel]}</p>

      {meeting.inventory && meeting.inventory.length > 0 && (
        <p><strong>Инвентарь:</strong> {meeting.inventory.join(', ')}</p>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={{ background: '#eee', borderRadius: 8, height: 8 }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 8,
            background: progress >= 100 ? '#FF9800' : '#4CAF50',
            transition: 'width 0.3s',
          }} />
        </div>
        <p style={{ marginTop: 4 }}>
          {meeting.participantsCount}/{meeting.maxParticipants} участников
        </p>
      </div>

      <p style={{
        color: meeting.status === 0 ? '#4CAF50' : meeting.status === 1 ? '#FF9800' : '#999',
        fontWeight: 'bold',
      }}>
        {statusLabels[meeting.status]}
      </p>

      {canShowGuestButton && (
        <button onClick={() => navigate('/login')} style={{ marginTop: 16 }}>
          Войдите, чтобы присоединиться и обсудить встречу
        </button>
      )}

      {isAuthenticated && canJoin && (
        <button onClick={handleJoin} disabled={joining} style={{ marginTop: 16 }}>
          {joining ? '...' : 'Присоединиться (+)'}
        </button>
      )}

      {isAuthenticated && canLeave && (
        <button onClick={handleLeave} disabled={leaving} style={{ marginTop: 16 }}>
          {leaving ? '...' : 'Выйти (-)'}
        </button>
      )}

      {showEditModal && (
        <EditMeetingModal
          meetingId={meeting.id}
          onClose={() => setShowEditModal(false)}
          onUpdated={onUpdate}
        />
      )}
    </div>
  );
}