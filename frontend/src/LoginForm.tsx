import React, { useState } from "react";
import { loginUser, requestPasswordReset, resendVerificationEmail } from './api';
import { showNotification } from './AppNotificationModal';

type User = {
  id: number;
  _id?: string;
  name: string;
  email: string;
  type: string;
  subscribed: boolean;
  campus: string;
};

interface LoginFormProps {
  onLoginSuccess: (user: User, token?: string) => void;
  onShowRegister: () => void;
  onClose: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onShowRegister, onClose }) => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const sendPasswordReset = async () => {
    if (!loginData.email) {
      setError('Enter your email address first');
      return;
    }
    setEmailActionLoading(true);
    setError('');
    try {
      const response = await requestPasswordReset(loginData.email);
      showNotification({ type: 'success', title: 'Check your email', message: response.message });
      setRecoveryMode(false);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not request a password reset');
    } finally {
      setEmailActionLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!loginData.email) {
      setError('Enter your email address first');
      return;
    }
    setEmailActionLoading(true);
    setError('');
    try {
      const response = await resendVerificationEmail(loginData.email);
      showNotification({ type: 'success', title: 'Verification email requested', message: response.message });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not resend the verification email');
    } finally {
      setEmailActionLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await loginUser({
        email: loginData.email,
        password: loginData.password
      });
      
      // Pass both user AND token to parent component
      onLoginSuccess(response.user, response.token);
      setLoginData({ email: '', password: '' });
      
      showNotification({
        type: 'success',
        title: `Welcome back, ${response.user.name}`,
        message: 'You are signed in and ready to continue.',
        actionLabel: 'Continue'
      });

    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      console.error('❌ Login failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    onClose();
    onShowRegister();
  };

  return (
    <div className="apple-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="apple-modal-card bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-2">{recoveryMode ? 'Reset your password' : 'Login to FYC Marketplace'}</h2>
        {recoveryMode && <p className="text-sm text-gray-600 mb-4">Enter your account email and we’ll send a secure, single-use reset link.</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email Address"
          className="w-full p-3 border rounded mb-4"
          value={loginData.email}
          onChange={e => setLoginData(prev => ({ ...prev, email: e.target.value }))}
          autoFocus
          disabled={loading}
        />
        {!recoveryMode && <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded mb-4"
          value={loginData.password}
          onChange={e => setLoginData(prev => ({ ...prev, password: e.target.value }))}
          onFocus={(e) => e.target.select()}
          disabled={loading}
        />}
        {!recoveryMode && <div className="flex justify-between gap-3 -mt-1 mb-4 text-sm">
          <button type="button" className="text-blue-600 hover:underline" onClick={() => { setRecoveryMode(true); setError(''); }} disabled={loading || emailActionLoading}>Forgot password?</button>
          <button type="button" className="text-blue-600 hover:underline" onClick={resendVerification} disabled={loading || emailActionLoading}>Resend verification</button>
        </div>}
        <div className="flex gap-2">
          <button 
            onClick={recoveryMode ? sendPasswordReset : handleLogin}
            disabled={loading || emailActionLoading}
            className="flex-1 bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {recoveryMode ? (emailActionLoading ? 'Sending...' : 'Send reset link') : (loading ? 'Logging in...' : 'Login')}
          </button>
          <button 
            onClick={recoveryMode ? () => { setRecoveryMode(false); setError(''); } : onClose}
            disabled={loading}
            className="flex-1 bg-gray-300 p-3 rounded hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            {recoveryMode ? 'Back' : 'Cancel'}
          </button>
        </div>
        {!recoveryMode && <p className="text-center mt-4 text-sm text-gray-600">
          Don't have an account?{' '}
          <button 
            className="text-blue-600 hover:underline"
            onClick={handleSwitchToRegister}
            disabled={loading}
          >
            Register here
          </button>
        </p>}
      </div>
    </div>
  );
};

export default LoginForm;
