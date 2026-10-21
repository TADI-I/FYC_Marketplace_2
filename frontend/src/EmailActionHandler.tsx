import React, { useEffect, useState } from 'react';
import { resetPassword, verifyEmailAddress } from './api';
import { showNotification } from './AppNotificationModal';

function removeEmailActionQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete('verify-email');
  url.searchParams.delete('reset-password');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

const EmailActionHandler: React.FC = () => {
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verificationToken = params.get('verify-email');
    const passwordToken = params.get('reset-password');
    if (passwordToken) setResetToken(passwordToken);
    if (!verificationToken) return;

    verifyEmailAddress(verificationToken)
      .then((response) => showNotification({
        type: 'success',
        title: 'Email verified',
        message: response.message || 'Your email is verified. You can now sign in.'
      }))
      .catch((error) => showNotification({
        type: 'error',
        title: 'Verification link problem',
        message: error.message || 'This verification link is invalid or expired.'
      }))
      .finally(removeEmailActionQuery);
  }, []);

  if (!resetToken) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      showNotification({ type: 'warning', title: 'Password is too short', message: 'Use at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      showNotification({ type: 'warning', title: 'Passwords do not match', message: 'Enter the same password twice.' });
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword(resetToken, password);
      setResetToken(null);
      removeEmailActionQuery();
      showNotification({ type: 'success', title: 'Password updated', message: response.message || 'You can now sign in.' });
    } catch (error) {
      showNotification({ type: 'error', title: 'Reset link problem', message: error instanceof Error ? error.message : 'Could not reset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apple-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="apple-modal-card bg-white rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-2">Choose a new password</h2>
        <p className="text-sm text-gray-600 mb-4">This secure link can be used once.</p>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" className="w-full p-3 border rounded mb-3" autoFocus disabled={loading} />
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full p-3 border rounded mb-4" disabled={loading} />
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:bg-blue-400" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
};

export default EmailActionHandler;
