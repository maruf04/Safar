import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_URL } from './utils';
import { AuthLayout } from './Login';
import { Alert, Icon, Spinner } from './ui';
import { useT } from '../i18n';

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name' },
  { name: 'phone_number', label: 'Mobile number', type: 'tel', autoComplete: 'tel', hint: '11 digits, e.g. 01XXXXXXXXX', maxLength: 11, inputMode: 'numeric' },
  { name: 'username', label: 'Username', type: 'text', autoComplete: 'username', hint: 'At least 3 characters' },
];

function AddUser() {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ name: '', phone_number: '', username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const e = {};
    if (!formData.name.trim()) e.name = t('Full name is required');
    if (!formData.phone_number.trim()) e.phone_number = t('Mobile number is required');
    else if (!/^\d{11}$/.test(formData.phone_number.replace(/\s+/g, ''))) e.phone_number = t('Mobile number must be exactly 11 digits');
    if (!formData.username.trim()) e.username = t('Username is required');
    else if (formData.username.length < 3) e.username = t('Username must be at least 3 characters');
    if (!formData.password) e.password = t('Password is required');
    else if (formData.password.length < 6) e.password = t('Password must be at least 6 characters');
    return e;
  };

  const onSubmitForm = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    setServerError('');
    try {
      const response = await fetchWithAuth(`${API_URL}/user/register`, {
        method: 'POST',
        body: JSON.stringify(formData),
      }, navigate);

      if (response.status === 201) {
        setSuccess(true);
        setTimeout(() => navigate('/users/login', { state: location.state }), 1500);
      } else {
        const data = await response.json();
        setServerError(data.error || t('Something went wrong.'));
      }
    } catch (err) {
      setServerError(t('Network error. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      image="train-street.jpg"
      title={t('Create your account')}
      subtitle={t('It takes less than a minute.')}
      footer={<>{t('Already have an account?')} <Link to="/users/login" state={location.state}>{t('Sign in')}</Link></>}
    >
      {success && <Alert tone="success">{t('Account created! Taking you to sign in…')}</Alert>}
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <form onSubmit={onSubmitForm} className="stack" noValidate>
        {FIELDS.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`reg-${f.name}`}>{t(f.label)}</label>
            <input
              id={`reg-${f.name}`}
              className="input"
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              maxLength={f.maxLength}
              value={formData[f.name]}
              onChange={handleChange}
              aria-invalid={!!errors[f.name]}
              aria-describedby={`reg-${f.name}-msg`}
            />
            {errors[f.name]
              ? <span id={`reg-${f.name}-msg`} className="field-error">{errors[f.name]}</span>
              : f.hint && <span id={`reg-${f.name}-msg`} className="field-hint">{t(f.hint)}</span>}
          </div>
        ))}

        <div className="field">
          <label htmlFor="reg-password">{t('Password')}</label>
          <div className="input-wrap">
            <input
              id="reg-password"
              className="input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              aria-invalid={!!errors.password}
              aria-describedby="reg-password-msg"
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
          {errors.password
            ? <span id="reg-password-msg" className="field-error">{errors.password}</span>
            : <span id="reg-password-msg" className="field-hint">{t('At least 6 characters')}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubmitting || success}>
          {isSubmitting ? <Spinner label={t('Creating account…')} /> : t('Create account')}
        </button>
      </form>
    </AuthLayout>
  );
}

export default AddUser;
