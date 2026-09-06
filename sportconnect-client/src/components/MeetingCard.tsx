import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import EditMeetingModal from './EditMeetingModal';
import { getErrorMessage } from '../utils/errorMessage';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useSignalR } from '../hooks/useSignalR';
import MeetingChat from './MeetingChat';
import '../styles/meeting-card.css';

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

const CHAT_MIN = 148;
const CHAT_DEFAULT_DESKTOP = 280;
const CHAT_DEFAULT_MOBILE = 180;

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export default function MeetingCard({ meeting, onClose, onUpdate }: MeetingCardProps) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [chatHeight, setChatHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [detailsClipped, setDetailsClipped] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; height: number } | null>(null);
  const ignoreCloseRef = useRef(false);

  const SIGNALR_URL = import.meta.env.VITE_SIGNALR_URL || 'https://localhost:7055/hubs/meeting';
  const { connection, isConnected, connectionState } = useSignalR(SIGNALR_URL);

  const measureChatHeight = useCallback(() => {
    return sectionRef.current?.offsetHeight ?? (isMobileViewport() ? CHAT_DEFAULT_MOBILE : CHAT_DEFAULT_DESKTOP);
  }, []);

  const clampChatHeight = useCallback((next: number) => {
    const panel = panelRef.current;
    const pinned = pinnedRef.current;
    if (!panel || !pinned) {
      return Math.max(CHAT_MIN, next);
    }
    const sectionGap = 12;
    const max = Math.max(CHAT_MIN, panel.clientHeight - pinned.offsetHeight - sectionGap);
    return Math.round(Math.min(max, Math.max(CHAT_MIN, next)));
  }, []);

  useEffect(() => {
    document.body.classList.add('meeting-card-open');

    const onViewport = () => {
      setChatHeight((height) => height == null ? height : clampChatHeight(height));
    };

    window.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('scroll', onViewport);

    return () => {
      document.body.classList.remove('meeting-card-open');
      window.removeEventListener('resize', onViewport);
      window.visualViewport?.removeEventListener('resize', onViewport);
      window.visualViewport?.removeEventListener('scroll', onViewport);
    };
  }, [clampChatHeight]);

  useEffect(() => {
    const node = detailsRef.current;
    if (!node) return;

    const update = () => {
      setDetailsClipped(node.scrollHeight - node.clientHeight > 8);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [chatHeight, meeting.id]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.y - event.clientY;
      setChatHeight(clampChatHeight(dragRef.current.height + delta));
    };

    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      document.body.classList.remove('is-chat-resizing');
      window.setTimeout(() => {
        ignoreCloseRef.current = false;
      }, 0);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, clampChatHeight]);

  const resetChatHeight = useCallback(() => {
    setChatHeight(null);
  }, []);

  const onResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = chatHeight ?? measureChatHeight();
    dragRef.current = { y: event.clientY, height: start };
    ignoreCloseRef.current = true;
    setChatHeight(start);
    setDragging(true);
    document.body.classList.add('is-chat-resizing');
  };

  const onResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.y - event.clientY;
    setChatHeight(clampChatHeight(dragRef.current.height + delta));
  };

  const onResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
    document.body.classList.remove('is-chat-resizing');
    window.setTimeout(() => {
      ignoreCloseRef.current = false;
    }, 0);
  };

  const onResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setChatHeight((height) => clampChatHeight((height ?? measureChatHeight()) + 24));
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setChatHeight((height) => clampChatHeight((height ?? measureChatHeight()) - 24));
    }
    if (event.key === 'Home') {
      event.preventDefault();
      resetChatHeight();
    }
  };

  useEffect(() => {
    if (!isConnected) return;

    const conn = connection.current;
    if (!conn) return;

    conn.on('ParticipantJoined', () => onUpdate());
    conn.on('ParticipantLeft', () => onUpdate());
    conn.on('StatusChanged', () => onUpdate());
    conn.on('MeetingCancelled', () => {
      onUpdate();
      onClose();
    });

    conn.invoke('JoinMeetingGroup', meeting.id).catch(() => {});

    return () => {
      conn.off('ParticipantJoined');
      conn.off('ParticipantLeft');
      conn.off('StatusChanged');
      conn.off('MeetingCancelled');
      conn.invoke('LeaveMeetingGroup', meeting.id).catch(() => {});
    };
  }, [isConnected, meeting.id]);

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
      showToast(getErrorMessage(err, 'Ошибка'), 'error');
    } finally {
      setLeaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Отменить встречу? Это действие нельзя отменить.')) return;
    try {
      await api.post(`/meetings/${meeting.id}/cancel`);
      showToast('Встреча отменена', 'success');
      onUpdate();
      onClose();
    } catch (err: any) {
      showToast(getErrorMessage(err, 'Ошибка'), 'error');
    }
  };

  const progress = meeting.maxParticipants > 0
    ? (meeting.participantsCount / meeting.maxParticipants) * 100
    : 0;

  const canShowGuestButton = !isAuthenticated && (meeting.status === 0 || meeting.status === 1);
  const statusColor = meeting.status === 0 ? '#708D81' : meeting.status === 1 ? '#F4D58D' : '#E56B6F';

  return (
    <div className="meeting-card-overlay" onClick={() => { if (!ignoreCloseRef.current) onClose(); }}>
      <div ref={panelRef} className="meeting-card-panel" onClick={(e) => e.stopPropagation()}>
        <div ref={pinnedRef} className="meeting-card-pinned">
          <div className="meeting-card-header">
            <span className="meeting-card-sport" style={{ background: meeting.sportColor }}>
              {meeting.sportName}
            </span>
            <button type="button" className="meeting-card-close" onClick={onClose} aria-label="Закрыть">✕</button>
          </div>

          <h2 className="meeting-card-title">{meeting.title}</h2>

          {meeting.description && (
            <p className="meeting-card-description">{meeting.description}</p>
          )}
        </div>

        <div ref={detailsRef} className={`meeting-card-details${detailsClipped ? ' is-clipped' : ''}`}>
          <div className="meeting-card-details-inner">
            {meeting.canEdit && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="meeting-card-btn-secondary" onClick={() => setShowEditModal(true)}>
                  Редактировать
                </button>
                <button type="button" className="meeting-card-btn-danger" onClick={handleCancel}>
                  Отменить
                </button>
              </div>
            )}

            <div className="meeting-card-info-columns">
              <div className="meeting-card-info-column">
                <p><strong>Автор:</strong> {meeting.authorName}</p>
                <p><strong>Время:</strong> {formatRelativeTime(meeting.scheduledAt)}</p>
              </div>
              <div className="meeting-card-info-column">
                <p><strong>Уровень:</strong> {skillLabels[meeting.requiredSkillLevel]}</p>
                <p><strong>Уровень автора:</strong> {skillLabels[meeting.authorSkillLevel]}</p>
              </div>
            </div>

            {meeting.address && (
              <p className="meeting-card-address"><strong>Место:</strong> {meeting.address}</p>
            )}

            {meeting.inventory && meeting.inventory.length > 0 && (
              <p className="meeting-card-address"><strong>Инвентарь:</strong> {meeting.inventory.join(', ')}</p>
            )}

            <div className="meeting-card-progress">
              <div
                className="meeting-card-progress-fill"
                style={{
                  width: `${progress}%`,
                  background: progress >= 100 ? '#F4D58D' : '#708D81',
                }}
              />
            </div>
            <p style={{ margin: '4px 0 8px', fontSize: 13 }}>
              {meeting.participantsCount}/{meeting.maxParticipants} участников
            </p>

            <p className="meeting-card-status" style={{ color: statusColor }}>
              {statusLabels[meeting.status]}
            </p>

            <div className="meeting-card-buttons">
              {canShowGuestButton && (
                <button type="button" className="meeting-card-btn" onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('open-login-modal'));
                }}>
                  Войти
                </button>
              )}

              {isAuthenticated && meeting.canJoin && (
                <button type="button" className="meeting-card-btn" onClick={handleJoin} disabled={joining}>
                  {joining ? '...' : 'Присоединиться (+)'}
                </button>
              )}

              {isAuthenticated && meeting.canLeave && (
                <button type="button" className="meeting-card-btn-secondary" onClick={handleLeave} disabled={leaving}>
                  {leaving ? '...' : 'Выйти (-)'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          ref={sectionRef}
          className="meeting-card-section"
          style={chatHeight == null ? undefined : { height: chatHeight, flex: `0 0 ${chatHeight}px` }}
        >
          <MeetingChat
            meetingId={meeting.id}
            isReadOnly={meeting.status === 3 || meeting.status === 4}
            connection={connection}
            isConnected={isConnected}
            connectionState={connectionState}
            resizeHandle={{
              dragging,
              onPointerDown: onResizePointerDown,
              onPointerMove: onResizePointerMove,
              onPointerUp: onResizePointerUp,
              onDoubleClick: resetChatHeight,
              onKeyDown: onResizeKeyDown,
              valueNow: chatHeight ?? CHAT_DEFAULT_DESKTOP,
              valueMin: CHAT_MIN,
              valueMax: 800,
            }}
          />
        </div>

        {showEditModal && (
          <EditMeetingModal
            meetingId={meeting.id}
            onClose={() => setShowEditModal(false)}
            onUpdated={onUpdate}
          />
        )}
      </div>
    </div>
  );
}