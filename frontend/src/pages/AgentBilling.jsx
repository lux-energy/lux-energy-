import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { agentBillingService } from '../services/agentBillingService';
import LoadingSpinner from '../components/LoadingSpinner';

const money = (amount) => `${Number(amount || 0).toLocaleString()} RWF`;

const AgentBilling = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState({ bills: [], debtByCustomer: [], unbilledOrders: [] });
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setError('');
    try {
      setBilling(await agentBillingService.getStationBilling());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load station invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createInvoice = async (order) => {
    setCreatingId(order.id);
    setError('');
    setNotice('');
    try {
      await agentBillingService.createInvoice(order.id);
      setNotice(`Invoice created for order #${order.id}.`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create invoice.');
    } finally {
      setCreatingId(null);
    }
  };

  const downloadProof = async (bill) => {
    setError('');
    try {
      const file = await agentBillingService.downloadPaymentProof(bill.id);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = bill.proof_original_name || `payment-proof-${bill.id}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to download payment proof.');
    }
  };

  const reviewProof = async (bill, decision) => {
    setReviewingId(bill.id);
    setError('');
    setNotice('');
    try {
      const result = await agentBillingService.reviewPaymentProof(bill.id, decision, reviewNotes[bill.id] || '');
      setNotice(result.message);
      setReviewNotes((current) => ({ ...current, [bill.id]: '' }));
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to review payment proof.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/agent/login');
  };

  if (loading) return <LoadingSpinner />;

  const totalOutstanding = billing.debtByCustomer.reduce((sum, item) => sum + Number(item.outstanding_balance || 0), 0);
  const unpaidCount = billing.debtByCustomer.reduce((sum, item) => sum + Number(item.unpaid_invoice_count || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-900 text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-sm font-semibold text-gold-300">Station operations</p>
            <h1 className="text-2xl font-bold">Customer balances & invoices</h1>
            <p className="mt-1 text-sm text-white/75">{user?.name} · Station {user?.station_id}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Agent workspace">
            <Link to="/agent" className="rounded border border-white/40 px-3 py-2 text-sm">Workspace</Link>
            <Link to="/agent/orders" className="rounded border border-white/40 px-3 py-2 text-sm">Orders</Link>
            <Link to="/agent/services" className="rounded border border-white/40 px-3 py-2 text-sm">Services</Link>
            <Link to="/agent/reports" className="rounded border border-white/40 px-3 py-2 text-sm">Daily reports</Link>
            <button onClick={handleLogout} className="rounded border border-white/40 px-3 py-2 text-sm">Logout</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-7">
        {error && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Outstanding debt summary">
          <div className="border-l-4 border-red-700 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Station outstanding</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{money(totalOutstanding)}</p>
          </div>
          <div className="border-l-4 border-amber-600 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Unpaid invoices</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{unpaidCount}</p>
          </div>
        </section>

        <section className="mb-9">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Customer balances</h2>
              <p className="text-sm text-gray-600">Outstanding invoices for customers served by your station.</p>
            </div>
            <button className="text-sm font-semibold text-primary-700" onClick={load}>Refresh</button>
          </div>
          {billing.debtByCustomer.length ? (
            <div className="overflow-x-auto bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Open invoices</th><th className="px-4 py-3">Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billing.debtByCustomer.map((customer) => (
                    <tr key={customer.customer_id}>
                      <td className="px-4 py-3"><p className="font-semibold text-gray-900">{customer.customer_name}</p><p className="text-xs text-gray-500">{customer.email}</p></td>
                      <td className="px-4 py-3">{customer.unpaid_invoice_count}</td>
                      <td className="px-4 py-3 font-semibold text-red-700">{money(customer.outstanding_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="bg-white p-5 text-sm text-gray-600 shadow-sm">No outstanding customer balances.</p>}
        </section>

        <section className="mb-9">
          <h2 className="mb-1 text-lg font-bold text-gray-900">Completed orders without an invoice</h2>
          <p className="mb-3 text-sm text-gray-600">Invoices are generated from completed orders and cannot be duplicated.</p>
          {billing.unbilledOrders.length ? (
            <div className="divide-y divide-gray-100 bg-white shadow-sm">
              {billing.unbilledOrders.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-gray-900">Order #{order.id} · {order.product_name} · {order.quantity} {order.unit}</p>
                    <p className="text-sm text-gray-600">{order.customer_name} · completed {new Date(order.updated_at).toLocaleDateString()}</p>
                  </div>
                  <button className="btn-primary" disabled={creatingId === order.id} onClick={() => createInvoice(order)}>
                    {creatingId === order.id ? 'Creating...' : 'Create invoice'}
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="bg-white p-5 text-sm text-gray-600 shadow-sm">Every completed station order already has an invoice.</p>}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-900">Invoice history</h2>
          {billing.bills.length ? (
            <div className="space-y-3">
              {billing.bills.map((bill) => (
                <article key={bill.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 bg-white p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{bill.customer_name} · {bill.description}</p>
                    <p className="text-sm text-gray-600">Invoice #{bill.id} · Order #{bill.order_id} · Due {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{money(bill.amount)}</p>
                    <p className={`text-sm font-semibold capitalize ${bill.status === 'paid' ? 'text-green-700' : 'text-amber-700'}`}>{bill.status}</p>
                  </div>
                  {bill.proof_status && (
                    <div className="w-full border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-700">
                        Payment proof: <span className="font-semibold capitalize">{bill.proof_status}</span>
                        {bill.proof_review_note ? ` · ${bill.proof_review_note}` : ''}
                      </p>
                      {bill.proof_status === 'pending' && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button className="border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50" onClick={() => downloadProof(bill)}>
                            Download receipt
                          </button>
                          <input
                            className="input-field min-w-56 flex-1"
                            placeholder="Note for customer (needed if rejected)"
                            value={reviewNotes[bill.id] || ''}
                            onChange={(event) => setReviewNotes((current) => ({ ...current, [bill.id]: event.target.value }))}
                          />
                          <button className="border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" disabled={reviewingId === bill.id || !reviewNotes[bill.id]?.trim()} onClick={() => reviewProof(bill, 'rejected')}>
                            Reject
                          </button>
                          <button className="bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800" disabled={reviewingId === bill.id} onClick={() => reviewProof(bill, 'approved')}>
                            {reviewingId === bill.id ? 'Reviewing...' : 'Verify payment'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : <p className="bg-white p-5 text-sm text-gray-600 shadow-sm">No station invoices yet.</p>}
        </section>
      </main>
    </div>
  );
};

export default AgentBilling;