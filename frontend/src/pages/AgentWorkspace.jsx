import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { orderService } from '../services/orderService';
import { reportService } from '../services/reportService';
import { portalService } from '../services/portalService';

const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];

const downloadFile = (file, filename) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const AgentWorkspace = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadWorkspace = async () => {
    setError('');
    const [ordersResult, reportsResult, servicesResult] = await Promise.allSettled([
      orderService.getStationOrders(),
      reportService.list(),
      portalService.getStationServices()
    ]);
    if (ordersResult.status === 'fulfilled') setOrders(ordersResult.value);
    else setError(ordersResult.reason.response?.data?.message || 'Unable to load station orders.');
    if (reportsResult.status === 'fulfilled') setReports(reportsResult.value);
    else setError((current) => current || 'Unable to load daily reports.');
    if (servicesResult.status === 'fulfilled') setServices(servicesResult.value);
    else setError((current) => current || 'Unable to load customer services.');
    setUpdatedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadWorkspace();
    const refreshId = window.setInterval(loadWorkspace, 30000);
    return () => window.clearInterval(refreshId);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/agent/login');
  };

  const exportOrders = async () => {
    try {
      const workbook = await orderService.exportStationOrders();
      downloadFile(workbook, 'station-orders.xlsx');
    } catch {
      setError('Excel workbook could not be generated. Please try again.');
    }
  };

  const exportFollowUpSheet = async () => {
    try {
      const { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, WidthType } = await import('docx');
      const headers = ['Customer', 'Phone', 'Request', 'Status', 'Resolution / next step'];
      const followUps = orders.filter((order) => activeStatuses.includes(order.status));
      const rows = followUps.length ? followUps.map((order) => [
        order.customer_name || '', order.customer_phone || '',
        `${order.product_name || ''} · ${order.quantity || ''} ${order.unit || ''}`,
        order.status || '', ''
      ]) : [['No active orders', '', '', '', '']];
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headers, ...rows].map((row) => new TableRow({
          children: row.map((text) => new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [new Paragraph(String(text))]
          }))
        }))
      });
      const documentFile = new Document({
        sections: [{ children: [
          new Paragraph({ text: 'Customer follow-up log', heading: HeadingLevel.TITLE }),
          new Paragraph(`Agent: ${user?.name || ''} | Station: ${user?.station_id || ''} | Date: ${new Date().toLocaleDateString()}`),
          table,
          new Paragraph({ text: 'Follow-up notes', heading: HeadingLevel.HEADING_2 }),
          new Paragraph('________________________________________________________________________________'),
          new Paragraph('________________________________________________________________________________')
        ] }]
      });
      downloadFile(await Packer.toBlob(documentFile), 'customer-follow-up.docx');
    } catch {
      setError('Word document could not be generated. Please try again.');
    }
  };

  if (loading) return <LoadingSpinner />;

  const activeOrders = orders.filter((order) => activeStatuses.includes(order.status));
  const activeServices = services.filter((service) => service.status === 'active');
  const recentServices = services.slice(0, 5);
  const pendingReports = reports.filter((report) => ['draft', 'returned'].includes(report.status)).length;
  const recentOrders = [...activeOrders].slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-primary-900 text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-sm font-semibold text-gold-300">Lux Energy · Station {user?.station_id}</p>
            <h1 className="mt-1 text-2xl font-bold">Agent workspace</h1>
            <p className="mt-1 text-sm text-white/75">Good day, {user?.name}. Your station work in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={loadWorkspace} className="border border-white/40 px-3 py-2 text-sm hover:bg-white/10">Refresh</button>
            <button onClick={handleLogout} className="border border-white/40 px-3 py-2 text-sm hover:bg-white/10">Sign out</button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        {error && <div role="alert" className="mb-5 border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Station work summary">
          <div className="border-t-4 border-amber-500 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Active customer orders</p>
            <p className="mt-2 text-3xl font-bold">{activeOrders.length}</p>
          </div>
          <div className="border-t-4 border-gold-600 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Active customer services</p>
            <p className="mt-2 text-3xl font-bold">{activeServices.length}</p>
          </div>
          <div className="border-t-4 border-emerald-700 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Reports to finish</p>
            <p className="mt-2 text-3xl font-bold">{pendingReports}</p>
          </div>
          <div className="border-t-4 border-primary-700 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Station orders loaded</p>
            <p className="mt-2 text-3xl font-bold">{orders.length}</p>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Your work</h2>
              <p className="text-sm text-gray-600">Open a station workflow and pick up where you left off.</p>
            </div>
            {updatedAt && <p className="text-xs text-gray-500">Updated {updatedAt.toLocaleTimeString()}</p>}
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/agent/orders" className="border border-gray-200 bg-white p-5 shadow-sm hover:border-primary-600">
              <span className="text-xs font-semibold uppercase text-primary-700">Operations</span>
              <h3 className="mt-2 font-bold">Customer orders</h3>
              <p className="mt-1 text-sm text-gray-600">Update order status and keep customers informed.</p>
            </Link>
            <Link to="/agent/services" className="border border-gray-200 bg-white p-5 shadow-sm hover:border-primary-600">
              <span className="text-xs font-semibold uppercase text-gold-700">Customer care</span>
              <h3 className="mt-2 font-bold">Customer services</h3>
              <p className="mt-1 text-sm text-gray-600">View customer service activations and their latest status.</p>
            </Link>
            <Link to="/agent/billing" className="border border-gray-200 bg-white p-5 shadow-sm hover:border-primary-600">
              <span className="text-xs font-semibold uppercase text-amber-700">Finance</span>
              <h3 className="mt-2 font-bold">Balances and invoices</h3>
              <p className="mt-1 text-sm text-gray-600">Review outstanding balances and prepare invoices.</p>
            </Link>
            <Link to="/agent/reports" className="border border-gray-200 bg-white p-5 shadow-sm hover:border-primary-600">
              <span className="text-xs font-semibold uppercase text-emerald-700">Shift close</span>
              <h3 className="mt-2 font-bold">Daily reports</h3>
              <p className="mt-1 text-sm text-gray-600">Record sales, cash, stock, incidents, and shift tasks.</p>
            </Link>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Recent customer services</h2>
              <p className="text-sm text-gray-600">Latest customer service activations for your station.</p>
            </div>
            <Link to="/agent/services" className="text-sm font-semibold text-primary-700 hover:underline">View all services</Link>
          </div>
          {recentServices.length ? (
            <div className="overflow-x-auto bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last updated</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentServices.map((service) => (
                    <tr key={service.id}>
                      <td className="px-4 py-3 font-semibold">{service.customer_name}</td>
                      <td className="px-4 py-3">{service.title}</td>
                      <td className="px-4 py-3 capitalize">{service.status}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(service.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="bg-white p-5 text-sm text-gray-600 shadow-sm">No customer services have been activated for your station yet.</p>}
        </section>

        <section className="mb-8 border-y border-gray-200 py-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Customer service tools</h2>
            <p className="text-sm text-gray-600">Create files you can open and continue working on in Microsoft Office.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportOrders} disabled={!orders.length} className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50">
              Export orders for Excel (.xlsx)
            </button>
            <button onClick={exportFollowUpSheet} className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100">
              Download follow-up sheet for Word (.docx)
            </button>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Active customer requests</h2>
              <p className="text-sm text-gray-600">The next orders needing attention at your station.</p>
            </div>
            <Link to="/agent/orders" className="text-sm font-semibold text-primary-700 hover:underline">View order queue</Link>
          </div>
          {recentOrders.length ? (
            <div className="overflow-x-auto bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                  <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Delivery</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-semibold">{order.customer_name}</td>
                      <td className="px-4 py-3">{order.product_name} · {order.quantity} {order.unit}</td>
                      <td className="px-4 py-3 capitalize">{order.status}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-gray-600">{order.delivery_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="bg-white p-5 text-sm text-gray-600 shadow-sm">No active customer orders right now.</p>}
        </section>
      </main>
    </div>
  );
};

export default AgentWorkspace;