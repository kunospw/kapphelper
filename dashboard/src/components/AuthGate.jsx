import { LoadingState } from './primitives.jsx';

export function AuthGate({ auth, children }) {
  if (auth.status === 'loading') return <main className="auth-shell"><LoadingState title="Checking session" message="Restoring the Firebase session." /></main>;

  if (auth.status === 'authenticated') return children;

  return <main className="auth-shell"><section className="login-card"><div className="login-mark">K</div><p className="eyebrow">Kairos internal</p><h1>KAppHelper Dashboard</h1><p>Sign in with your GitHub account to access the internal project and team meeting view.</p><button className="github-button" type="button" onClick={auth.signIn} disabled={auth.status === 'configuration-required' || auth.status === 'signing-in'}>{auth.status === 'signing-in' ? 'Opening GitHub…' : 'Continue with GitHub'}</button>{auth.error && <p className="auth-error" role="alert">{auth.error}</p>}{auth.status === 'configuration-required' && <p className="auth-note">Firebase setup is required before GitHub sign-in can be enabled.</p>}<p className="auth-note">Internal use only. Do not upload credentials, client data, or proprietary documents.</p></section></main>;
}
