import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessage';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      navigate('/map');
    } catch (err: any) {
      showToast(getErrorMessage(err, 'Ошибка входа'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Вход</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Пароль</label>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '30px' }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </span>
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      <p>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </div>
  );
}