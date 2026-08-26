import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import type { HubConnection } from '@microsoft/signalr';
import './MeetingChat.css';

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
}

export default function MeetingChat({
  meetingId,
  isReadOnly,
  connection,
  isConnected,
}: MeetingChatProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

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

    if (isAuthenticated) {
      loadHistory();
    } else {
      setLoadingHistory(false);
    }
  }, [meetingId, isAuthenticated]);

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

    if (!content || sending || !connection.current || !isConnected) {
      if (!isConnected) {
        showToast('Чат не подключён', 'error');
      }
      return;
    }

    setSending(true);
    try {
      await connection.current.invoke('SendMessage', meetingId, content);
      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: any) {
      console.error('Send message error:', err);
      showToast('Не удалось отправить сообщение', 'error');
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
        <span>Чат встречи</span>
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
                <span>{formatRelativeTime(msg.sentAt)}</span>
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
  );
}