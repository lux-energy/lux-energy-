import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AgentLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const { loginAgent } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await loginAgent(form.email, form.password);
      navigate('/agent');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">Station agent login</h1>
        <p className="text-gray-600 mb-6">View incoming customer orders and keep them updated.</p>
        {location.state?.passwordResetMessage && <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{location.state.passwordResetMessage}</div>}
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700" htmlFor="agent-login-email">Work email
            <input id="agent-login-email" className="input-field mt-1" type="email" autoComplete="username" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="block text-sm font-medium text-gray-700" htmlFor="agent-login-password">Password
            <input id="agent-login-password" className="input-field mt-1" type="password" autoComplete="current-password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait...' : 'Login'}</button>
        </form>
        <div className="mt-6 border-t pt-4 text-sm text-gray-600">
          <Link className="mb-3 block text-primary-700 hover:underline" to="/forgot-password/agent">Forgot password?</Link>
          Customer? <Link className="text-gold-600 font-semibold" to="/login">Use the customer login</Link>
        </div>
      </div>
    </div>
  );
};

export default AgentLogin;
