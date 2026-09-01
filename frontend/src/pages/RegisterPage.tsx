import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isApiError } from '../api/client';
import { Recaptcha } from '../components/Recaptcha';
import logo from '../assets/logo.png';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA check.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register(name, email, password, recaptchaToken);
      navigate('/catalog', { replace: true });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
      setRecaptchaResetKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-main narrow">
      <div className="card auth-card">
        <img className="auth-logo" src={logo} alt="Arsi India Info" />
        <div className="auth-title">Create your account</div>
        <div className="auth-sub">New accounts start with the standard customer role.</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <div className="field-hint">At least 8 characters.</div>
          </div>
          <Recaptcha onVerify={setRecaptchaToken} resetKey={recaptchaResetKey} />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !recaptchaToken}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="inline-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
