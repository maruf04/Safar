import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from './AppContext';
import { API_URL } from './utils';
import { Alert, Icon, Spinner } from './ui';
import { useT } from '../i18n';

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

export const AuthLayout = ({ title, subtitle, children, footer }) => (
  <>
    <section className="band" style={{ paddingBottom: 120 }}>
      <div className="container container-xs" style={{ textAlign: 'center' }}>
        <h1>{title}</h1>
        {subtitle && <p style={{ marginTop: 8 }}>{subtitle}</p>}
      </div>
    </section>
    <div className="container container-xs overlap section" style={{ marginTop: -88 }}>
      <div className="card card-raised card-pad stack">{children}</div>
      {footer && <p className="small muted" style={{ textAlign: 'center', marginTop: 16 }}>{footer}</p>}
    </div>
  </>
);

const Login = ({ setAuth }) => {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoginState, setUserId } = useData();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Plain fetch: a 401 here means bad credentials, not an expired session
      const response = await fetch(`${API_URL}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await response.json();

      if (response.status === 200 && json.access_token) {
        const token = json.access_token;
        localStorage.setItem('token', token);
        const decoded = decodeToken(token);
        const id = decoded?.user_id || decoded?.id || null;
        localStorage.setItem('userId', id);

        if (setAuth) setAuth(true);
        setLoginState(true);
        setUserId(id);
        navigate(location.state?.from || '/', { replace: true });
      } else {
        if (setAuth) setAuth(false);
        setError(t('Wrong username or password. Please try again.'));
        setPassword('');
      }
    } catch (err) {
      setError(t('Couldn’t reach the server. Please try again in a moment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('Welcome back')}
      subtitle={t('Sign in to book seats and manage your tickets.')}
      footer={<>{t('New to Safar?')} <Link to="/users" state={location.state}>{t('Create an account')}</Link></>}
    >
      {location.state?.from && !error && (
        <Alert tone="info">{t('Sign in to continue with your booking.')}</Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}

      <form onSubmit={handleSubmit} className="stack">
        <div className="field">
          <label htmlFor="username">{t('Username')}</label>
          <input
            id="username"
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t('Password')}</label>
          <div className="input-wrap">
            <input
              id="password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('Hide password') : t('Show password')}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} />
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? <Spinner label={t('Signing in…')} /> : t('Sign in')}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
