import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { confirmEmailChange, resetPassword, verifyEmailAddress } from './api';

const EmailActionHandler: React.FC = () => {
  const action = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/reset-password') return { type: 'reset', token: params.get('token') };
    if (window.location.pathname === '/confirm-email-change') return { type: 'email-change', token: params.get('token') };
    if (window.location.pathname === '/verify-email') return { type: 'verify', token: params.get('token') };
    const legacyReset = params.get('reset-password');
    if (legacyReset) return { type: 'reset', token: legacyReset };
    const verification = params.get('verify-email');
    return verification ? { type: 'verify', token: verification } : null;
  }, []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedMessage, setCompletedMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!action || action.type === 'reset') return;
    if (!action.token) {
      setActionError('This link is incomplete or invalid.');
      return;
    }
    setLoading(true);
    const request = action.type === 'email-change'
      ? confirmEmailChange(action.token)
      : verifyEmailAddress(action.token);
    request
      .then(response => setCompletedMessage(response.message || 'Your email address has been confirmed.'))
      .catch(error => setActionError(error.message || 'This link is invalid or expired.'))
      .finally(() => setLoading(false));
  }, [action]);

  if (!action) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError('');
    if (!action.token) return setActionError('This reset link is incomplete or invalid.');
    if (password.length < 8) return setActionError('Use a password with at least 8 characters.');
    if (password !== confirmPassword) return setActionError('The passwords do not match.');
    setLoading(true);
    try {
      const response = await resetPassword(action.token, password);
      setCompletedMessage(response.message || 'Password updated. You can now sign in.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    // This is a deliberate full navigation: it clears the action-route state
    // and remounts the component-based marketplace at its canonical URL.
    window.location.replace('/');
  };

  return (
    <main className="email-action-page" aria-live="polite">
      <section className="email-action-card">
        <div className={`email-action-icon${completedMessage ? ' is-complete' : ''}`} aria-hidden="true">
          {completedMessage ? <CheckCircle2 /> : <KeyRound />}
        </div>
        {completedMessage ? (
          <>
            <p className="email-action-eyebrow">Completed</p>
            <h1>All set</h1>
            <p>{completedMessage}</p>
            <button type="button" className="email-action-primary" onClick={close}>Return to marketplace</button>
          </>
        ) : action.type === 'reset' ? (
          <form onSubmit={submit}>
            <p className="email-action-eyebrow">Account security</p>
            <h1>Choose a new password</h1>
            <p>This secure link works once. Use at least 8 characters.</p>
            {actionError && <div className="email-action-error" role="alert">{actionError}</div>}
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" autoFocus disabled={loading} />
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" disabled={loading} />
            <button className="email-action-primary" type="submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
          </form>
        ) : (
          <>
            <p className="email-action-eyebrow">Email confirmation</p>
            <h1>{loading ? 'Confirming your email…' : 'We couldn’t confirm that link'}</h1>
            <p>{actionError || 'Please wait while we securely verify your request.'}</p>
            {!loading && <button type="button" className="email-action-primary" onClick={close}>Return to marketplace</button>}
          </>
        )}
      </section>
    </main>
  );
};

export default EmailActionHandler;
