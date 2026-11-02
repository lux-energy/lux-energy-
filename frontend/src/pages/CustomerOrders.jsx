import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaGasPump } from 'react-icons/fa';
import { stationService } from '../services/stationService';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomerPortalLayout from '../layouts/CustomerPortalLayout';
import PaymentInstructions from '../components/PaymentInstructions';

const CustomerOrders = () => {
  const { user } = useAuth();
  const [stations, setStations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [paymentProof, setPaymentProof] = useState(null);
  const [replacementFiles, setReplacementFiles] = useState({});
  const [resubmittingId, setResubmittingId] = useState(null);
  const [form, setForm] = useState({
    station_id: '', order_type: 'fuel', product_name: 'Petrol', quantity: '', unit: 'liters',
    delivery_address: '', contact_phone: user?.phone || '', notes: ''
  });

  const loadOrders = async () => {
    const data = await orderService.getMine();
    setOrders(data);
  };

  useEffect(() => {
    Promise.all([stationService.getOrderableStations(), loadOrders()])
      .then(([stationData]) => {
        setStations(stationData);
        if (stationData.length > 0) setForm((current) => ({ ...current, station_id: stationData[0].id }));
      })
      .catch(() => setError('Unable to load stations or orders right now.'))
      .finally(() => setLoading(false));
  }, []);

  const handleTypeChange = (event) => {
    const orderType = event.target.value;
    setForm({ ...form, order_type: orderType, product_name: orderType === 'gas' ? 'LPG Gas' : 'Petrol', unit: orderType === 'gas' ? 'cylinders' : 'liters' });
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    const orderForm = event.currentTarget;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const orderData = new FormData();
      Object.entries({ ...form, quantity: Number(form.quantity), station_id: Number(form.station_id), payment_method: paymentMethod })
        .forEach(([key, value]) => orderData.append(key, value));
      orderData.append('payment_proof', paymentProof);
      await orderService.create(orderData);
      await loadOrders();
      setForm((current) => ({ ...current, quantity: '', notes: '' }));
      setPaymentProof(null);
      orderForm.reset();
      setMessage('Your order and payment receipt were sent to the station. An agent will verify payment before processing your order.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send the order.');
    } finally {
      setSaving(false);
    }
  };

  const resubmitProof = async (event, order) => {
    event.preventDefault();
    const file = replacementFiles[order.id];
    if (!file) return;
    setResubmittingId(order.id);
    setMessage('');
    setError('');
    try {
      const result = await orderService.submitPaymentProof(order.id, paymentMethod, file);
      await loadOrders();
      setReplacementFiles((current) => ({ ...current, [order.id]: null }));
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit the payment receipt.');
    } finally {
      setResubmittingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <CustomerPortalLayout
      title="Track & place orders"
      subtitle="Attach your payment receipt when you place an order. The station verifies payment before processing it."
    >
      <PaymentInstructions forOrder />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-5">New order</h2>
          {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {stations.length === 0 && <div role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No stations are accepting online orders right now. Please contact Lux Energy for assistance.</div>}
          <form id="order-payment-proof" onSubmit={submitOrder} className="space-y-4">
            <select className="input-field" value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })} required disabled={!stations.length}>
              <option value="">Choose station</option>
              {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
            </select>
            <select className="input-field" value={form.order_type} onChange={handleTypeChange}>
              <option value="fuel">Fuel</option>
              <option value="gas">Gas</option>
            </select>
            <input className="input-field" placeholder="Product name" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field" type="number" min="1" step="0.01" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              <input className="input-field" placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
            </div>
            <input className="input-field" placeholder="Delivery address" value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} required />
            <input className="input-field" placeholder="Contact phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} required />
            <textarea className="input-field" rows={3} placeholder="Notes for the station (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <label className="block text-sm font-medium text-gray-700">
              Payment method
              <select className="input-field mt-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-800">
              Payment receipt document <span className="text-red-700">Required</span>
              <input
                className="mt-2 block w-full text-sm"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setPaymentProof(event.target.files?.[0] || null)}
                required
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">Upload the receipt for this payment as PDF, JPG, PNG, or WEBP. Maximum 10 MB.</span>
            </label>
            <button className="btn-primary w-full" disabled={saving || !stations.length}>{saving ? 'Submitting order and receipt...' : 'Submit order with payment receipt'}</button>
          </form>
          <Link to="/stations" className="block text-center text-primary-600 mt-4">View station locations</Link>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-5">Your orders</h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-600">
              <FaGasPump className="text-gray-400 text-5xl mx-auto mb-4" />
              You have not placed an order yet.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{order.product_name} · {order.quantity} {order.unit}</h3>
                      <p className="text-sm text-gray-600">{order.station_name}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-gold-100 text-gold-700 text-sm font-semibold">{order.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">Delivery: {order.delivery_address}</p>
                  <p className="mt-2 text-sm font-semibold text-gray-800">Payment proof: <span className="capitalize">{order.payment_proof_status || 'not submitted'}</span></p>
                  {order.payment_proof_review_note && <p className="mt-1 text-sm text-red-700">Station note: {order.payment_proof_review_note}</p>}
                  {order.status === 'pending' && order.payment_proof_status !== 'pending' && order.payment_proof_status !== 'approved' && (
                    <form className="mt-4 border-t border-gray-100 pt-4" onSubmit={(event) => resubmitProof(event, order)}>
                      <label className="block text-sm font-semibold text-gray-800">
                        {order.payment_proof_status === 'rejected' ? 'Upload a replacement receipt' : 'Add payment receipt to this pending order'}
                        <input
                          className="mt-2 block w-full text-sm"
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(event) => setReplacementFiles((current) => ({ ...current, [order.id]: event.target.files?.[0] || null }))}
                          required
                        />
                      </label>
                      <button className="btn-primary mt-3" disabled={resubmittingId === order.id}>
                        {resubmittingId === order.id ? 'Submitting...' : 'Submit receipt'}
                      </button>
                    </form>
                  )}
                  {order.agent_notes && <p className="mt-2 text-sm text-primary-700">Station note: {order.agent_notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerPortalLayout>
  );
};

export default CustomerOrders;
