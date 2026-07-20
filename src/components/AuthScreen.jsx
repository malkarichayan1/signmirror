import { useState } from 'react';
import { signIn, signUp } from '../lib/auth.js';
import { pullCloudData, pushLocalData } from '../lib/cloudSync.js';
import { isFirebaseConfigured } from '../lib/firebase.js';
import './AuthScreen.css';

// mode: 'signin' | 'signup'. onAuthed(user) fires after the local/cloud
// data sync completes, so the caller can safely re-read localStorage.
export default function AuthScreen({ onAuthed, onSkip }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const user = await signUp(email, password);
        // Adopt any progress made before creating an account into the cloud.
        await pushLocalData(user.uid);
        onAuthed(user);
      } else {
        const user = await signIn(email, password);
        // Existing account — cloud data (if any) wins over this device's local state.
        await pullCloudData(user.uid);
        onAuthed(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen auth-screen">
      <div className="auth-card">
        <div className="auth-badge" aria-hidden="true">🤟</div>
        <h2 className="tab-title">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        <p className="tab-sub">
          {mode === 'signup'
            ? 'Save your lessons and Mastery Test scores so they follow you across devices.'
            : 'Sign in to pick up right where you left off.'}
        </p>

        {!isFirebaseConfigured && (
          <p className="auth-warning">
            Sign-in isn’t configured yet — the app still works, but progress only saves on this device.
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!isFirebaseConfigured}
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={!isFirebaseConfigured}
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || !isFirebaseConfigured}
          >
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>

        <button type="button" className="auth-skip" onClick={onSkip}>
          Continue without an account
        </button>
      </div>
    </div>
  );
}
