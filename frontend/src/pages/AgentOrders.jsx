import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';

const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

const AgentOrders = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});

  const handleLogout = () => {
    logout();
    navigate('/agent/login');
  };

  const loadOrders = async () => {
    setError('');
    try {
      setOrders(await orderService.getStationOrders());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load station orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const refreshId = window.setInterval(loadOrders, 30000);
    return () => window.clearInterval(refreshId);
  }, []);

  const updateOrder = async (id, status, agent_notes) => {
    setSavingId(id);
    try {
      const updated = await orderService.update(id, { status, agent_notes });
      setOrders((current) => current.map((order) => order.id === id ? updated : order).filter((order) => !['completed', 'cancelled'].includes(order.status)));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update this order.');
    } finally {
      setSavingId(null);
    }
  };

  const downloadProof = async (order) => {
    try {
      const file = await orderService.downloadPaymentProof(order.id);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-${order.id}-payment-proof`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to download the payment receipt.');
    }
  };

  const reviewProof = async (order, decision) => {
    setReviewingId(order.id);
    setError('');
    setNotice('');
    try {
      const result = await orderService.reviewPaymentProof(order.id, decision, reviewNotes[order.id] || '');
      setNotice(result.message);
      setReviewNotes((current) => ({ ...current, [order.id]: '' }));
      await loadOrders();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to review the payment receipt.');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-16"><div className="container mx-auto px-4 flex flex-wrap justify-between items-end gap-4"><div><p className="text-gold-300 font-semibold mb-2">Station operations</p><h1 className="text-4xl font-bold">Customer orders</h1><p className="text-gray-100 mt-2">Welcome, {user?.name}. Keep customers updated from here.</p></div><div className="flex items-center gap-3"><Link to="/agent" className="bg-white/10 border border-white/30 px-4 py-2 rounded-lg">Workspace</Link><Link to="/agent/services" className="bg-white/10 border border-white/30 px-4 py-2 rounded-lg">Customer services</Link><Link to="/agent/billing" className="bg-white/10 border border-white/30 px-4 py-2 rounded-lg">Customer balances</Link><Link to="/agent/reports" className="bg-white/10 border border-white/30 px-4 py-2 rounded-lg">Daily reports</Link><button onClick={handleLogout} className="bg-white/10 border border-white/30 px-4 py-2 rounded-lg">Logout</button></div></div></section>
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Active requests</h2>
            <button onClick={loadOrders} className="font-semibold text-primary-600">Refresh</button>
          </div>
          {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {notice && <div role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</div>}
          {orders.length === 0 ? (
            <div className="bg-white p-10 text-center text-gray-600 shadow-md">No active customer orders right now.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {orders.map((order) => {
                const proofApproved = order.payment_proof_status === 'approved';
                const allowedStatuses = proofApproved ? statuses : ['pending', 'cancelled'];
                return (
                  <article key={order.id} className="bg-white p-5 shadow-md">
                    <div className="mb-3 flex justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{order.product_name} · {order.quantity} {order.unit}</h3>
                        <p className="text-sm text-gray-600">Order #{order.id} · {order.customer_name}</p>
                      </div>
                      <span className="text-sm font-semibold capitalize text-gold-700">{order.status}</span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Phone: {order.customer_phone}</p>
                      <p>Delivery: {order.delivery_address}</p>
                      <p>Station: {order.station_name}</p>
                      <p>Paid by: {(order.payment_method || '').replace('_', ' ')}</p>
                      {order.notes && <p>Customer note: {order.notes}</p>}
                    </div>
                    <div className={`mt-4 border-l-4 p-3 text-sm ${proofApproved ? 'border-emerald-700 bg-emerald-50' : order.payment_proof_status === 'rejected' ? 'border-red-600 bg-red-50' : 'border-amber-500 bg-amber-50'}`}>
                      <p className="font-semibold capitalize">Payment receipt: {order.payment_proof_status || 'missing'}</p>
                      {order.payment_proof_review_note && <p className="mt-1">Customer note: {order.payment_proof_review_note}</p>}
                      {order.payment_proof_status && order.payment_proof_status !== 'rejected' && (
                        <button className="mt-2 text-sm font-semibold text-primary-700 underline" onClick={() => downloadProof(order)}>Download receipt</button>
                      )}
                      {order.payment_proof_status === 'pending' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <input
                            className="input-field min-w-48 flex-1"
                            placeholder="Reason required to reject"
                            value={reviewNotes[order.id] || ''}
                            onChange={(event) => setReviewNotes((current) => ({ ...current, [order.id]: event.target.value }))}
                          />
                          <button className="border border-red-300 px-3 py-2 font-semibold text-red-700" disabled={reviewingId === order.id || !reviewNotes[order.id]?.trim()} onClick={() => reviewProof(order, 'rejected')}>Reject</button>
                          <button className="bg-emerald-700 px-3 py-2 font-semibold text-white" disabled={reviewingId === order.id} onClick={() => reviewProof(order, 'approved')}>{reviewingId === order.id ? 'Reviewing...' : 'Approve receipt'}</button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <select className="input-field" value={order.status} disabled={savingId === order.id} onChange={(event) => updateOrder(order.id, event.target.value, order.agent_notes)}>
                        {allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <button className="btn-primary" disabled={savingId === order.id} onClick={() => updateOrder(order.id, order.status, order.agent_notes)}>{savingId === order.id ? 'Saving...' : 'Update'}</button>
                    </div>
                    {!proofApproved && <p className="mt-2 text-xs text-gray-500">Order processing is locked until the receipt is approved.</p>}
                    <input className="input-field mt-3" placeholder="Note to customer" value={order.agent_notes || ''} onChange={(event) => setOrders((current) => current.map((item) => item.id === order.id ? { ...item, agent_notes: event.target.value } : item))} />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AgentOrders;
