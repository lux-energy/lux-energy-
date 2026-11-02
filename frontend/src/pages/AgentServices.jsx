import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portalService } from '../services/portalService';
import LoadingSpinner from '../components/LoadingSpinner';

const formatDate = (value) => (
  value ? new Date(value).toLocaleString() : '—'
);

const statusStyles = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

const AgentServices = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadServices = async (backgroundRefresh = false) => {
    setError('');
    if (backgroundRefresh) setRefreshing(true);
    try {
      setServices(await portalService.getStationServices());
      setUpdatedAt(new Date());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load customer services.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServices();
    const refreshId = window.setInterval(() => loadServices(true), 30000);
    return () => window.clearInterval(refreshId);
  }, []);

  const filteredServices = useMemo(
    () => statusFilter === 'all'
      ? services
      : services.filter((service) => service.status === statusFilter),
    [services, statusFilter]
  );
  const activeCount = services.filter((service) => service.status === 'active').length;
  const handleLogout = () => {
    logout();
    navigate('/agent/login');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-primary-900 text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-sm font-semibold text-gold-300">Station operations</p>
            <h1 className="text-2xl font-bold">Customer services</h1>
            <p className="mt-1 text-sm text-white/75">{user?.name} · Station {user?.station_id}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Agent workspace">
            <Link to="/agent" className="rounded border border-white/40 px-3 py-2 text-sm">Workspace</Link>
            <Link to="/agent/orders" className="rounded border border-white/40 px-3 py-2 text-sm">Orders</Link>
            <Link to="/agent/billing" className="rounded border border-white/40 px-3 py-2 text-sm">Balances</Link>
            <Link to="/agent/reports" className="rounded border border-white/40 px-3 py-2 text-sm">Daily reports</Link>
            <button onClick={handleLogout} className="rounded border border-white/40 px-3 py-2 text-sm">Sign out</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-7">
        {error && <div role="alert" className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Latest customer activity</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Service activations and status changes selected for your station. This is a service-subscription record,
              not a one-time fuel order.
            </p>
            {updatedAt && <p className="mt-2 text-xs text-gray-500">Updated {updatedAt.toLocaleTimeString()}</p>}
          </div>
          <button
            type="button"
            onClick={() => loadServices(true)}
            disabled={refreshing}
            className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Customer service summary">
          <div className="border-l-4 border-gold-600 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Active services</p>
            <p className="mt-1 text-2xl font-bold">{activeCount}</p>
          </div>
          <div className="border-l-4 border-primary-700 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Recent station services</p>
            <p className="mt-1 text-2xl font-bold">{services.length}</p>
          </div>
          <div className="border-l-4 border-emerald-700 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">Auto refresh</p>
            <p className="mt-1 text-2xl font-bold">30 sec</p>
          </div>
        </section>

        <section className="bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
            <div>
              <h2 className="font-bold">Service history</h2>
              <p className="text-sm text-gray-500">Showing the latest {services.length} service records.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              Status
              <select
                className="input-field py-2"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          {filteredServices.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-600">
              {services.length
                ? 'There are no services for this status.'
                : 'No customers have activated services at your station yet.'}
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredServices.map((service) => (
                <article key={service.id} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <h3 className="font-semibold">{service.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">{service.customer_name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      {service.customer_phone && <a className="hover:text-primary-700" href={`tel:${service.customer_phone}`}>{service.customer_phone}</a>}
                      {service.customer_email && <a className="break-all hover:text-primary-700" href={`mailto:${service.customer_email}`}>{service.customer_email}</a>}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><span className="font-medium text-gray-800">Station:</span> {service.station_name || '—'}</p>
                    <p className="mt-1"><span className="font-medium text-gray-800">Activated:</span> {formatDate(service.started_at)}</p>
                    <p className="mt-1"><span className="font-medium text-gray-800">Last updated:</span> {formatDate(service.updated_at)}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[service.status] || 'bg-gray-100 text-gray-700'}`}>
                    {service.status}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className="mt-4 text-xs text-gray-500">For customer privacy, only records associated with your assigned station are shown.</p>
      </main>
    </div>
  );
};

export default AgentServices;
