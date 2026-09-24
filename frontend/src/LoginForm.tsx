import React, { useState } from "react";
import { loginUser } from './api';

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
      
      // Show success message
      setTimeout(() => {
        alert(`Welcome back, ${response.user.name}!`);
      }, 100);

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
        <h2 className="text-xl font-bold mb-4">Login to FYC Marketplace</h2>
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
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border rounded mb-4"
          value={loginData.password}
          onChange={e => setLoginData(prev => ({ ...prev, password: e.target.value }))}
          onFocus={(e) => e.target.select()}
          disabled={loading}
        />
        <div className="flex gap-2">
          <button 
            onClick={handleLogin} 
            disabled={loading}
            className="flex-1 bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="flex-1 bg-gray-300 p-3 rounded hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
        <p className="text-center mt-4 text-sm text-gray-600">
          Don't have an account?{' '}
          <button 
            className="text-blue-600 hover:underline"
            onClick={handleSwitchToRegister}
            disabled={loading}
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
