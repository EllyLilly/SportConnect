import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';
import '../styles/modal.css';

interface RegisterModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ onClose, onSwitchToLogin }: RegisterModalProps) {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(userName, email, password);
      showToast('Регистрация успешна!', 'success');
      onClose();
    } catch (err: any) {
      const message = getErrorMessage(err, 'Ошибка регистрации');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">Регистрация</h2>

        <form onSubmit={handleSubmit}>
          <div className="modal-form-group">
            <label className="modal-label">Имя пользователя</label>
            <input
              type="text"
              className="modal-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Как вас зовут?"
              required
              minLength={3}
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Email</label>
            <input
              type="email"
              className="modal-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Пароль</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="modal-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
                minLength={8}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#f4d58d',
                  fontSize: '16px',
                }}
              >
                {showPassword ? '🕶' : '👁'}
              </button>
            </div>
            <p className="modal-hint">Пароль должен содержать цифры и буквы разного регистра</p>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-buttons">
            <button type="submit" className="modal-btn" disabled={loading}>
              {loading ? 'Создание...' : 'Зарегистрироваться'}
            </button>
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              Отмена
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16 }}>
          Уже есть аккаунт?{' '}
          <span className="modal-link" onClick={onSwitchToLogin}>
            Войти
          </span>
        </p>
      </div>
    </div>
  );
}