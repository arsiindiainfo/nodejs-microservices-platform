import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isApiError } from '../api/client';
import { Recaptcha } from '../components/Recaptcha';
import logo from '../assets/logo.png';

const DEMO_ACCOUNTS = [
  { label: 'Customer', email: 'customer@demotech.example', password: 'DemoTech!Customer2026' },
  { label: 'Admin', email: 'admin@demotech.example', password: 'DemoTech!Admin2026' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaResetKey, setRecaptchaResetKey] = useState(0);

  const from = (location.state as { from?: string })?.from ?? '/catalog';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA check.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await login(email, password, recaptchaToken);
      navigate(from, { replace: true });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
      setRecaptchaResetKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  }

  return (
    <div className="app-main narrow">
      <div className="card auth-card">
        <img className="auth-logo" src={logo} alt="Arsi India Info" />
        <div className="auth-title">Sign in to DemoTech Commerce</div>
        <div className="auth-sub">Browse the catalog, place orders, and track them in real time.</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Recaptcha onVerify={setRecaptchaToken} resetKey={recaptchaResetKey} />
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !recaptchaToken}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-demo-box">
          <strong>Try it instantly</strong> — use a seeded demo account:
          <div className="mt-8">
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.email} className="flex justify-between items-center mt-8">
                <span>
                  {account.label}: <code>{account.email}</code>
                </span>
                <button type="button" onClick={() => fillDemo(account.email, account.password)}>
                  Use this
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-footer">
          New here? <Link to="/register" className="inline-link">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
