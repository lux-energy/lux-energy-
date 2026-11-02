import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { passwordRecoveryService } from '../services/passwordRecoveryService';

const accountLabels = { customer: 'customer', agent: 'station agent', admin: 'admin' };
const resetMessage = 'If an account exists for this email, a reset code will be sent using your selected method. If it does not arrive, choose the other method and request a new code.';

const PasswordRecovery = () => {
  const { role: routeRole } = useParams();
  const isAdminRecovery = routeRole === 'admin';
  const [role, setRole] = useState(
    Object.hasOwn(accountLabels, routeRole) ? routeRole : 'customer'
  );
  const [channel, setChannel] = useState(routeRole === 'admin' || routeRole === 'agent' ? 'email' : '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const loginPath = role === 'admin' ? '/admin/login' : role === 'agent' ? '/agent/login' : '/login';

  const passwordChecks = [
    { label: 'At least 12 characters', valid: password.length >= 12 },
    { label: 'Uppercase and lowercase letters', valid: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'A number', valid: /\d/.test(password) },
    { label: 'A symbol', valid: /[^A-Za-z0-9]/.test(password) }
  ];

  const requestCode = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await passwordRecoveryService.requestCode({
        email,
        role,
        channel: role === 'admin' ? 'email' : channel,
        phone: channel === 'sms' ? phone : undefined
      });
      setMessage(response.message || resetMessage);
      setCodeSent(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not request a reset code.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!passwordChecks.every((check) => check.valid)) {
      setError('Choose a password that meets all the requirements.');
      return;
    }

    setBusy(true);
    try {
      const response = await passwordRecoveryService.resetPassword({
        email,
        role,
        channel: role === 'admin' ? 'email' : channel,
        code,
        password,
        confirmPassword
      });
      logout();
      navigate(loginPath, {
        replace: true,
        state: { passwordResetMessage: response.message }
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  };

  const requestAnotherCode = async (nextChannel = channel) => {
    setError('');
    setBusy(true);
    try {
      const response = await passwordRecoveryService.requestCode({
        email,
        role,
        channel: role === 'admin' ? 'email' : nextChannel,
        phone: nextChannel === 'sms' ? phone : undefined
      });
      setChannel(nextChannel);
      setMessage(response.message || resetMessage);
      setCode('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not request a reset code.');
    } finally {
      setBusy(false);
    }
  };

  if (routeRole && !Object.hasOwn(accountLabels, routeRole)) {
    return <main className="mx-auto mt-16 max-w-md px-4 text-center"><h1 className="text-2xl font-bold">Invalid recovery page</h1><Link className="mt-4 inline-block text-primary-700 underline" to="/">Return to account options</Link></main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-lg bg-white p-7 shadow-md sm:p-8">
        <p className="text-sm font-semibold text-gold-700">Account recovery</p>
        <h1 className="mt-1 text-2xl font-bold text-primary-800">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-600">{role === 'admin' ? 'We’ll send a one-time code to the account’s registered email.' : 'Choose one method for your reset code. The phone number must match the one registered to your account. If delivery fails, choose the other method and request a new code.'}</p>

        {error && <div role="alert" className="mt-5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {message && <div role="status" className="mt-5 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>}

        {!codeSent ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            {!isAdminRecovery && (
              <label className="block text-sm font-medium text-gray-700">Account type
                <select className="input-field mt-1" value={role} onChange={(event) => {
                  setRole(event.target.value);
                  setChannel(event.target.value === 'agent' ? 'email' : '');
                }}>
                  <option value="customer">Customer</option>
                  <option value="agent">Station agent</option>
                </select>
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700">Account email
              <input className="input-field mt-1" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {role !== 'admin' && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-700">Send reset code by</legend>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="recovery-channel" value="email" required checked={channel === 'email'} onChange={() => setChannel('email')} />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="recovery-channel" value="sms" required checked={channel === 'sms'} onChange={() => setChannel('sms')} />
                  Phone (SMS)
                </label>
                {channel === 'sms' && (
                  <label className="block text-sm font-medium text-gray-700">Registered phone number
                    <input className="input-field mt-1" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </label>
                )}
              </fieldset>
            )}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Requesting...' : 'Send reset code'}</button>
            <p className="text-xs text-gray-500">If an account exists for this email, one reset code will be sent using your selected method. Codes expire after 10 minutes.</p>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700">Six-digit {channel === 'sms' ? 'SMS' : 'email'} reset code
              <input className="input-field mt-1" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            </label>
            <label className="block text-sm font-medium text-gray-700">New password
              <input className="input-field mt-1" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs">
              <p className="font-semibold text-gray-800">Password requirements</p>
              <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {passwordChecks.map((check) => <li key={check.label} className={check.valid ? 'font-medium text-green-700' : 'text-gray-600'}>{check.valid ? '✓' : '•'} {check.label}</li>)}
              </ul>
            </div>
            <label className="block text-sm font-medium text-gray-700">Confirm new password
              <input className="input-field mt-1" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </label>
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Updating...' : 'Reset password'}</button>
            {role !== 'admin' && channel === 'sms' && (
              <button type="button" className="w-full text-sm font-semibold text-primary-700 underline" onClick={() => requestAnotherCode('email')} disabled={busy}>Use email instead</button>
            )}
            {role !== 'admin' && channel === 'email' && (
              <button type="button" className="w-full text-sm font-semibold text-primary-700 underline" onClick={() => requestAnotherCode('sms')} disabled={busy || !phone.trim()}>Use SMS instead</button>
            )}
            <button type="button" className="w-full text-sm font-semibold text-primary-700 underline" onClick={() => requestAnotherCode()} disabled={busy}>Resend using the same method</button>
          </form>
        )}

        <Link className="mt-6 inline-block text-sm font-semibold text-primary-700 underline" to={loginPath}>Back to sign in</Link>
      </section>
    </main>
  );
};

export default PasswordRecovery;
