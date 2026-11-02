import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { adminOpsService } from '../../services/portalService';
import { stationService } from '../../services/stationService';

const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
const provinces = ['', 'Kigali', 'Northern', 'Southern', 'Eastern', 'Western'];

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [province, setProvince] = useState('');
  const [message, setMessage] = useState('');
  const [orderStations, setOrderStations] = useState([]);

  const load = useCallback(async () => {
    const params = {};
    if (status) params.status = status;
    if (province) params.province = province;
    try {
      const [orderRows, staffedStations] = await Promise.all([
        adminOpsService.getAllOrders(params),
        stationService.getOrderableStations()
      ]);
      setOrders(orderRows);
      setOrderStations(staffedStations);
      return true;
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not refresh orders. Check your connection and try again.');
      return false;
    }
  }, [province, status]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const updateStatus = async (id, nextStatus) => {
    setMessage('');
    try {
      await adminOpsService.updateOrder(id, { status: nextStatus });
      if (!await load()) return;
      setMessage(`Order #${id} updated to ${nextStatus}.`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed.');
    }
  };

  const reassignOrder = async (order, stationId) => {
    if (!stationId || Number(stationId) === Number(order.station_id)) return;
    const destination = orderStations.find((station) => Number(station.id) === Number(stationId))?.name;
    if (!window.confirm(`Reassign order #${order.id} to ${destination}?`)) return;
    setMessage('');
    try {
      await adminOpsService.updateOrder(order.id, { status: order.status, station_id: Number(stationId) });
      if (!await load()) return;
      setMessage(`Order #${order.id} reassigned to ${destination || 'the selected station'}.`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Order reassignment failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-energy-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')} className="text-gray-600 hover:text-energy-600">
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Live Order Tracking</h1>
              <p className="text-xs text-gray-500">Auto-refreshes every 15 seconds</p>
            </div>
          </div>
          <span className="text-sm text-gray-600">{orders.length} orders</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field" value={province} onChange={(e) => setProvince(e.target.value)}>
            {provinces.map((p) => <option key={p || 'all'} value={p}>{p || 'All provinces'}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reassign to staffed station</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium">#{order.id} · {order.product_name}</div>
                    <div className="text-sm text-gray-500">{order.quantity} {order.unit} · {new Date(order.created_at).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div>{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_phone}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div>{order.station_name}</div>
                    <div className="text-sm text-gray-500">{order.province}</div>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      className="input-field min-w-52 text-sm"
                      value={order.station_id}
                      aria-label={`Reassign order ${order.id}`}
                      disabled={['completed', 'cancelled'].includes(order.status)}
                      onChange={(event) => reassignOrder(order, event.target.value)}
                    >
                      {!orderStations.some((station) => Number(station.id) === Number(order.station_id)) && (
                        <option value={order.station_id}>{order.station_name} · no active agent</option>
                      )}
                      {orderStations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 rounded-full bg-gold-100 text-gold-700 text-xs font-semibold">{order.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      className="input-field text-sm"
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                    >
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No orders match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
