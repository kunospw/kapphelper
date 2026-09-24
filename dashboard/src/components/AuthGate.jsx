import { useState } from 'react';
import { LoadingState } from './primitives.jsx';

export function AuthGate({ auth, children }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (auth.status === 'loading') return <main className="auth-shell"><LoadingState title="Checking session" message="Restoring your session." /></main>;

  if (auth.status === 'authenticated') return children;

  const busy = auth.status === 'signing-in' || auth.status === 'configuration-required';

  const onSubmit = (event) => {
    event.preventDefault();
    if (!email || !password) return;
    auth.signIn(email, password);
  };

  return <main className="auth-shell">
    <section className="login-card">
      <div className="login-mark">K</div>
      <p className="eyebrow">Kairos internal</p>
      <h1>KAppHelper Dashboard</h1>
      <p>Sign in with your registered Kairos developer account.</p>
      <form className="login-form" onSubmit={onSubmit}>
        <label>
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} required />
        </label>
        <button className="github-button" type="submit" disabled={busy}>
          {auth.status === 'signing-in' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {auth.error && <p className="auth-error" role="alert">{auth.error}</p>}
      {auth.status === 'configuration-required' && <p className="auth-note">API setup is required before sign-in can work.</p>}
      <p className="auth-note">Internal use only. Do not upload credentials, client data, or proprietary documents.</p>
      <p className="auth-note">No account? Ask an admin to register your email — there is no self-service sign-up.</p>
    </section>
  </main>;
}
