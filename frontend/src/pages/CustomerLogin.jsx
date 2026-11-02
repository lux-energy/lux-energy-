import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const CustomerLogin = () => {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.passwordResetMessage || '');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [verification, setVerification] = useState(() => {
    const saved = window.sessionStorage.getItem('customerVerification');
    if (!saved) return null;
    try {
      const pending = JSON.parse(saved);
      return pending
        && typeof pending.email === 'string'
        && (!pending.registrationChallenge || pending.channel === 'email')
        ? pending
        : null;
    } catch {
      window.sessionStorage.removeItem('customerVerification');
      return null;
    }
  });
  const [emailCode, setEmailCode] = useState('');
  const { loginCustomer, registerCustomer, verifyCustomerContacts, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const passwordChecks = [
    { label: 'At least 12 characters', valid: form.password.length >= 12 },
    { label: 'Lowercase and uppercase letters', valid: /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) },
    { label: 'A number', valid: /\d/.test(form.password) },
    { label: 'A symbol', valid: /[^A-Za-z0-9]/.test(form.password) }
  ];
  const strongPassword = passwordChecks.every((check) => check.valid);
  const retryActive = Number(verification?.retrySeconds || 0) > 0;

  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/portal', { replace: true });
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (verification) {
      window.sessionStorage.setItem('customerVerification', JSON.stringify(verification));
    } else {
      window.sessionStorage.removeItem('customerVerification');
    }
  }, [verification]);

  useEffect(() => {
    if (!retryActive) return undefined;
    const interval = window.setInterval(() => {
      setVerification((current) => current
        ? { ...current, retrySeconds: Math.max(0, Number(current.retrySeconds || 0) - 1) }
        : current);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [retryActive]);

  const switchMode = (nextRegistering) => {
    setRegistering(nextRegistering);
    setError('');
    setNotice('');
    setVerification(null);
    setEmailCode('');
    setForm((current) => ({ ...current, password: '' }));
  };

  const backToSignIn = () => {
    setForm((current) => ({ ...current, email: verification?.email || current.email, password: '' }));
    setVerification(null);
    setEmailCode('');
    setNotice('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      let result;
      if (registering) {
        result = await registerCustomer(form);
      } else {
        result = await loginCustomer(form.email, form.password);
      }
      if (result.verification_required) {
        setVerification({
          registrationChallenge: Boolean(registering),
          challengeId: result.challenge_id || '',
          email: result.email || form.email,
          phone: result.phone || form.phone,
          channel: registering ? 'email' : result.channel || (result.sms_sent ? 'sms' : 'email'),
          emailSent: Boolean(result.email_sent),
          smsSent: Boolean(result.sms_sent),
          emailVerified: Boolean(result.email_verified),
          phoneVerified: Boolean(result.phone_verified),
          emailMode: result.email_mode || 'mailpit',
          emailError: result.email_error || '',
          smsError: result.sms_error || '',
          retrySeconds: Number(result.retry_after_seconds) || 0
        });
        setForm((current) => ({ ...current, password: '' }));
        setNotice('');
        setError('');
        return;
      }
      window.sessionStorage.removeItem('customerVerification');
      setVerification(null);
      navigate('/portal', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.errors?.[0]?.msg || 'Unable to complete your request');
    } finally {
      setBusy(false);
    }
  };

  const verifyContact = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = verification.registrationChallenge
        ? await authService.verifyCustomerRegistration({
          challenge_id: verification.challengeId,
          code: emailCode
        })
        : await verifyCustomerContacts({
          email: verification.email,
          channel: verification.channel || 'email',
          code: emailCode
        });
      if (result.verification_complete) {
        window.sessionStorage.removeItem('customerVerification');
        setVerification(null);
        setRegistering(false);
        setForm((current) => ({ ...current, email: verification.email, password: '' }));
        setEmailCode('');
        setNotice(result.message);
        return;
      }
      if (result.token) {
        window.sessionStorage.removeItem('customerVerification');
        setVerification(null);
        navigate('/portal', { replace: true });
      } else {
        setVerification((current) => ({
          ...current,
          emailVerified: result.email_verified,
          phoneVerified: result.phone_verified
        }));
        setEmailCode('');
        setNotice(result.message);
      }
    } catch (requestError) {
      if (requestError.response?.status === 429) {
        setVerification((current) => ({
          ...current,
          retrySeconds: Number(requestError.response.data?.retry_after_seconds) || 900
        }));
      }
      setError(requestError.response?.data?.message || 'Unable to verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async (channel = verification.channel || 'email') => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      const result = verification.registrationChallenge
        ? await authService.resendCustomerRegistrationCode(verification.challengeId)
        : await authService.resendCustomerVerification(verification.email, channel);
      if (result.token) {
        window.sessionStorage.removeItem('customerVerification');
        setVerification(null);
        navigate('/portal', { replace: true });
        return;
      }
      setVerification((current) => ({
        ...current,
        email: result.email || current.email,
        phone: result.phone || current.phone,
        channel: result.channel || channel,
        emailSent: result.email_sent,
        smsSent: result.sms_sent,
        emailVerified: result.email_verified ?? current.emailVerified,
        phoneVerified: result.phone_verified ?? current.phoneVerified,
        emailMode: result.email_mode || current.emailMode,
        emailError: result.email_error || '',
        smsError: result.sms_error || '',
        retrySeconds: Number(result.retry_after_seconds) || 0
      }));
      setEmailCode('');
      setNotice(result.message || '');
    } catch (requestError) {
      const response = requestError.response;
      if (response?.status === 429) {
        const retrySeconds = Number(response.data?.retry_after_seconds) || 900;
        setVerification((current) => ({ ...current, retrySeconds }));
        setError('');
      } else {
        const message = response?.data?.message || 'Unable to send verification codes.';
        setVerification((current) => ({
          ...current,
          ...(verification.registrationChallenge || channel === 'email' ? { emailError: message } : { smsError: message })
        }));
        setEmailCode('');
        setError('');
      }
    } finally {
      setResending(false);
    }
  };

  if (loading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <span className="sr-only">{loading ? 'Checking your session...' : 'Opening your customer portal...'}</span>
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-energy-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">{verification ? `Verify your ${verification.channel === 'sms' ? 'phone' : 'email'}` : registering ? 'Create your account' : 'Customer login'}</h1>
        <p className="text-gray-600 mb-6">{verification ? verification.registrationChallenge ? verification.emailSent ? 'Enter the six-digit code sent to your email. Email ownership is verified before the account is created.' : 'We could not confirm email delivery. Retry sending a code; email ownership must be verified before account creation.' : `Enter the six-digit code sent to your ${verification.channel === 'sms' ? 'phone' : 'email'}. Choose the other method below if you want to receive a new code that way.` : 'Access your portal to track orders, manage services, pay bills, and submit tickets.'}</p>
        {!verification && (
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Customer account action">
            <button type="button" role="tab" aria-selected={!registering} className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${!registering ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} onClick={() => switchMode(false)}>Sign in</button>
            <button type="button" role="tab" aria-selected={registering} className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${registering ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`} onClick={() => switchMode(true)}>Create account</button>
          </div>
        )}
        {notice && !verification && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
        {error && !verification && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={verification ? (event) => event.preventDefault() : handleSubmit} className="space-y-4">
          {verification ? (
            <>
              {retryActive && <div role="alert" className="border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">Too many verification requests. Retry in {Math.floor(verification.retrySeconds / 60)}:{String(verification.retrySeconds % 60).padStart(2, '0')}.</div>}
              {error && !retryActive && <div role="alert" className="border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
              {notice && <div role="status" className="border-l-4 border-emerald-700 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}
              {!verification.registrationChallenge && <label className="block text-sm font-medium text-gray-700">Account email
                <input
                  className="input-field mt-1"
                  type="email"
                  autoComplete="email"
                  value={verification.email}
                  readOnly={verification.emailVerified}
                  onChange={(event) => {
                    setError('');
                    setVerification((current) => ({
                      ...current,
                      email: event.target.value,
                      emailSent: false,
                      emailError: ''
                    }));
                    setEmailCode('');
                  }}
                  required
                />
              </label>}
              <section className="border border-gray-200 p-4" aria-label="Contact verification">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{verification.channel === 'sms' ? 'Phone number' : 'Email address'}</h2>
                  <span className="text-sm text-gray-600">{verification.channel === 'sms' ? verification.phone : verification.email}</span>
                </div>
                <div className={`mt-3 grid ${verification.registrationChallenge ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                  {verification.registrationChallenge
                    ? <button type="button" className="border border-primary-700 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50" onClick={() => resendCode('email')} disabled={resending || retryActive}>
                      {resending ? 'Sending email...' : verification.emailSent ? 'Resend email code' : 'Send email code'}
                    </button>
                    : <button type="button" className="border border-primary-700 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50" onClick={() => resendCode('sms')} disabled={resending || retryActive || verification.phoneVerified}>
                      {resending && verification.channel === 'sms' ? 'Sending SMS...' : verification.smsSent ? 'Resend SMS code' : 'Send SMS code'}
                    </button>}
                  {!verification.registrationChallenge && <button type="button" className="border border-primary-700 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50" onClick={() => resendCode('email')} disabled={resending || retryActive || verification.emailVerified || !verification.email.trim()}>
                    {resending && verification.channel === 'email' ? 'Sending email...' : verification.emailSent ? 'Resend email code' : 'Use email instead'}
                  </button>}
                </div>
                {!verification.registrationChallenge && verification.smsError && <p role="alert" className="mt-2 text-sm text-amber-800">{verification.smsError}</p>}
                {verification.emailError && <p role="alert" className="mt-2 text-sm text-amber-800">{verification.emailError}</p>}
                {verification.channel === 'email' && verification.emailSent && verification.emailMode === 'mailpit' && <a className="mt-2 inline-block text-sm font-semibold text-primary-700 underline" href="http://127.0.0.1:8025/" target="_blank" rel="noreferrer">Open Mailpit inbox</a>}
                {verification.channel === 'email' && verification.emailSent && verification.emailMode === 'sandbox' && <p className="mt-2 text-sm text-gray-600">Email captured in Mailtrap Sandbox; it is not delivered to this inbox.</p>}
                {(verification.registrationChallenge
                  ? verification.emailSent
                  : verification.channel === 'sms' ? verification.smsSent : verification.emailSent) && (
                  <div className="mt-3 flex gap-2">
                    <input className="input-field" aria-label={`${verification.channel === 'sms' ? 'SMS' : 'Email'} verification code`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
                    <button type="button" className="btn-primary shrink-0" disabled={busy || emailCode.length !== 6} onClick={verifyContact}>{busy ? 'Checking...' : `Verify ${verification.channel === 'sms' ? 'phone' : 'email'}`}</button>
                  </div>
                )}
              </section>

              <p className="text-sm text-gray-600">{verification.registrationChallenge ? 'The same neutral confirmation is shown whether or not this information can be used to create an account.' : 'Your account is verified after you confirm the code sent using your selected method.'}</p>
            </>
          ) : (
            <>
          {registering && <label className="block text-sm font-medium text-gray-700" htmlFor="customer-name">Full name
            <input id="customer-name" className="input-field mt-1" autoComplete="name" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>}
          <label className="block text-sm font-medium text-gray-700" htmlFor="customer-email">Email address
            <input id="customer-email" className="input-field mt-1" type="email" autoComplete="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          {registering && <p className="text-sm text-gray-600">We will send a verification code to your email. You must verify your email before an account is created.</p>}
          {registering && <label className="block text-sm font-medium text-gray-700" htmlFor="customer-phone">Phone number
            <input id="customer-phone" className="input-field mt-1" type="tel" autoComplete="tel" placeholder="Phone number with country code, e.g. +250 7XX XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>}
          <label className="block text-sm font-medium text-gray-700" htmlFor="customer-password">Password
            <input id="customer-password" className="input-field mt-1" type="password" autoComplete={registering ? 'new-password' : 'current-password'} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          {registering && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-800">Password strength</p>
                <span className={`text-xs font-semibold ${strongPassword ? 'text-green-700' : 'text-gray-500'}`}>
                  {strongPassword ? 'Strong' : 'Needs improvement'}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className={`h-full rounded-full transition-all ${strongPassword ? 'w-full bg-green-600' : passwordChecks.filter((check) => check.valid).length >= 2 ? 'w-1/2 bg-amber-500' : 'w-1/4 bg-red-500'}`} />
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                {passwordChecks.map((check) => <li key={check.label} className={check.valid ? 'font-medium text-green-700' : 'text-gray-600'}><span aria-hidden="true">{check.valid ? '✓' : '•'}</span> {check.label}</li>)}
              </ul>
              <p className="mt-3 text-xs text-gray-600">Use a long, unique password that you don’t use for another account.</p>
            </div>
          )}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait...' : registering ? 'Create account' : 'Login'}</button>
            </>
          )}
        </form>
        <div className="mt-6 border-t pt-4 text-sm text-gray-600">
          {!verification && <Link className="mb-3 block text-primary-700 hover:underline" to="/forgot-password">Forgot password?</Link>}
          {!verification && <>Station employee? <Link className="text-gold-600 font-semibold" to="/agent/login">Use the agent login</Link></>}
          {verification && <button type="button" className="font-semibold text-primary-700 hover:underline" onClick={backToSignIn}>Back to sign in</button>}
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
