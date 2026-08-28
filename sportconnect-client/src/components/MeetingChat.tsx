import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatMessageTime } from '../utils/formatMessageTime';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import './MeetingChat.css';

function invokeWithTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Timeout: нет ответа от сервера')),
      ms,
    );
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeout,
  ]);
}

interface ChatMessage {
  id: string;
  meetingId: string;
  userId: string;
  userName: string;
  content: string;
  sentAt: string;
}

interface MeetingChatProps {
  meetingId: string;
  isReadOnly: boolean;
  connection: React.MutableRefObject<HubConnection | null>;
  isConnected: boolean;
  connectionState: HubConnectionState;
}

export default function MeetingChat({
  meetingId,
  isReadOnly,
  connection,
  isConnected,
  connectionState,
}: MeetingChatProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
  const onOffline = () => {
    setOnline(false);
    showToast('Нет соединения', 'error');
  };
  const onOnline = () => {
    setOnline(true);
  };
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  return () => {
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
  };
}, []);

    useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => setOnline(true);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
        window.removeEventListener('offline', goOffline);
        window.removeEventListener('online', goOnline);
    };
    }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Загрузка истории
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await api.get(`/meetings/${meetingId}/messages`);
        setMessages(response.data);
      } catch (err: any) {
        console.error('Failed to load message history:', err);
        showToast('Не удалось загрузить историю сообщений', 'error');
      } finally {
        setLoadingHistory(false);
      }
    };

    if (isAuthenticated && isConnected) {
      loadHistory();
    } else {
      setLoadingHistory(false);
    }
  }, [meetingId, isAuthenticated, isConnected]);

  // Подписка на новые сообщения
  useEffect(() => {
    if (!isConnected) return;

    const conn = connection.current;
    if (!conn) return;

    const handler = (message: ChatMessage) => {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    };

    conn.on('ReceiveMessage', handler);
    return () => {
      conn.off('ReceiveMessage', handler);
    };
  }, [isConnected, meetingId, connection]);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
  const content = newMessage.trim();
  if (!content || sending) return;

  if (!navigator.onLine) {
    showToast('Нет соединения. Сообщение не отправлено.', 'error');
    return;
  }

  const conn = connection.current;
  const live = conn?.state === HubConnectionState.Connected;

  if (!conn || !live) {
    showToast('Чат не подключён', 'error');
    return;
  }

  setSending(true);
  try {
    await invokeWithTimeout(conn.invoke('SendMessage', meetingId, content));
    setNewMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err ?? '');
    if (message.includes('Слишком много')) {
      showToast('Слишком много сообщений. Подождите минуту.', 'error');
    } else if (
      message.includes('Timeout') ||
      message.includes('Failed to fetch') ||
      message.includes('connection') ||
      !navigator.onLine
    ) {
      showToast('Нет соединения. Сообщение не отправлено.', 'error');
    } else {
      showToast('Не удалось отправить сообщение', 'error');
    }
  } finally {
    setSending(false);
  }
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

    const dotColor = !online
  ? '#f44336'
  : connectionState === HubConnectionState.Connected
    ? '#4CAF50'
    : connectionState === HubConnectionState.Reconnecting ||
      connectionState === HubConnectionState.Connecting
      ? '#FFC107'
      : '#f44336';

    const dotTitle =
    connectionState === HubConnectionState.Connected
        ? 'Подключено'
        : connectionState === HubConnectionState.Reconnecting ||
        connectionState === HubConnectionState.Connecting
        ? 'Переподключение'
        : 'Нет соединения';

  if (!isAuthenticated) {
  return (
    <div className="meeting-chat">
      <p className="chat-placeholder">Войдите, чтобы видеть чат встречи</p>
    </div>
  );
}

return (
  <div className="meeting-chat">
    <div className="chat-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          title={dotTitle}
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: dotColor,
          }}
        />
        <span>Чат встречи</span>
      </div>
      {isReadOnly && <span className="chat-readonly">Только чтение</span>}
    </div>

    <div className="chat-messages">
      {loadingHistory ? (
        <p className="chat-placeholder">Загрузка сообщений...</p>
      ) : messages.length === 0 ? (
        <p className="chat-placeholder">Сообщений пока нет</p>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.userId === user?.id ? 'own' : ''}`}
          >
            <div className="chat-message-header">
              <strong>{msg.userName}</strong>
              <span>{formatMessageTime(msg.sentAt)}</span>
            </div>
            <div className="chat-message-content">{msg.content}</div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>

    {!isReadOnly && (
      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          value={newMessage}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение... (Enter — отправить)"
          rows={1}
          disabled={sending || !isConnected}
        />
        <button
          onClick={handleSend}
          disabled={sending || !isConnected || !newMessage.trim()}
        >
          {sending ? '...' : '➤'}
        </button>
      </div>
    )}
  </div>
); }