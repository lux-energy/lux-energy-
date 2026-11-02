import React, { useEffect, useState } from 'react';
import { portalService } from '../services/portalService';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomerPortalLayout from '../layouts/CustomerPortalLayout';

const CustomerTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    description: ''
  });

  const load = async () => {
    setTickets(await portalService.getMyTickets());
  };

  useEffect(() => {
    load()
      .catch(() => setError('Unable to load tickets.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await portalService.createTicket(form);
      setForm({ subject: '', category: 'technical', priority: 'medium', description: '' });
      await load();
      setMessage('Ticket submitted. Our team will respond soon.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit ticket.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <CustomerPortalLayout
      title="Technical support"
      subtitle="Submit tickets for delivery, billing, account, or technical issues."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">New ticket</h2>
          {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <input
              className="input-field"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="delivery">Delivery</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </select>
            <select
              className="input-field"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <textarea
              className="input-field"
              rows={5}
              placeholder="Describe the issue"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
            <button className="btn-primary w-full" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit ticket'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Your tickets</h2>
          {tickets.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-10 text-gray-600 text-center">
              No support tickets yet.
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {ticket.category} · {ticket.priority} priority
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-gold-100 text-gold-700 text-sm font-semibold">
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-3">{ticket.description}</p>
                  {ticket.admin_notes && (
                    <p className="mt-2 text-sm text-primary-700">Support reply: {ticket.admin_notes}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    Opened {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerPortalLayout>
  );
};

export default CustomerTickets;
