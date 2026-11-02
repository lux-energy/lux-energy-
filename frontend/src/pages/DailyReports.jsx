import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/reportService';
import LoadingSpinner from '../components/LoadingSpinner';

const today = () => new Date().toLocaleDateString('en-CA');
const initialForm = () => ({
  report_date: today(),
  shift_name: 'day',
  sales_total: '',
  cash_collected: '',
  transaction_count: '',
  stock_levels: '',
  incidents: '',
  tasks_done: ''
});

const readForm = (report) => {
  const data = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
  return {
    report_date: report.report_date?.slice(0, 10) || today(),
    shift_name: report.shift_name || 'day',
    sales_total: report.sales_total || '',
    cash_collected: report.cash_collected || '',
    transaction_count: report.transaction_count || '',
    stock_levels: Array.isArray(data.stock_levels) ? data.stock_levels.map((item) => `${item.product || ''}: ${item.quantity ?? ''} ${item.unit || ''}`).join('\n') : data.stock_levels || '',
    incidents: data.incidents || '',
    tasks_done: Array.isArray(data.tasks_done) ? data.tasks_done.join('\n') : data.tasks_done || ''
  };
};

const reportPayload = (form) => ({
  report_date: form.report_date,
  shift_name: form.shift_name,
  report_data: {
    sales: form.sales_total === '' ? [] : [{ total: Number(form.sales_total) }],
    cash_collected: Number(form.cash_collected || 0),
    transaction_count: Number(form.transaction_count || 0),
    stock_levels: form.stock_levels.split('\n').map((line) => line.trim()).filter(Boolean),
    incidents: form.incidents.trim(),
    tasks_done: form.tasks_done.split('\n').map((line) => line.trim()).filter(Boolean)
  }
});

const normalizeReportData = (value) => {
  if (typeof value !== 'string') return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const statusStyle = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  returned: 'bg-red-100 text-red-800'
};

const Metric = ({ label, value }) => (
  <div className="border-l-4 border-primary-700 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
    <p className="mt-1 text-xl font-bold text-gray-900">{value ?? 0}</p>
  </div>
);

const ReportBars = ({ items, labelKey, valueKey }) => {
  const maximum = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);
  if (!items.length) return <p className="text-sm text-gray-500">No report data yet.</p>;
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        return (
          <div key={item[labelKey]}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate text-gray-700">{item[labelKey]}</span>
              <span className="font-semibold text-gray-900">{value.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-100">
              <div className="h-full bg-primary-700" style={{ width: `${Math.max((value / maximum) * 100, value ? 3 : 0)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DailyReports = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const offlineDraftKey = user?.id ? `lux-daily-report-draft-${user.id}` : null;
  const isAgent = role === 'agent';
  const isAdmin = ['admin', 'super_admin'].includes(role);
  const [reports, setReports] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [pendingAgents, setPendingAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [reviewNotes, setReviewNotes] = useState({});
  const [audit, setAudit] = useState({});
  const [period, setPeriod] = useState('day');
  const [filterDate, setFilterDate] = useState(today());
  const [pendingShift, setPendingShift] = useState('day');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  useEffect(() => {
    if (!offlineDraftKey) return;
    try {
      const savedDraft = JSON.parse(localStorage.getItem(offlineDraftKey) || 'null');
      if (savedDraft?.form) {
        setForm(savedDraft.form);
        setNotice(`Device draft restored from ${new Date(savedDraft.savedAt).toLocaleString()}.`);
      }
    } catch {
      localStorage.removeItem(offlineDraftKey);
    }
  }, [offlineDraftKey]);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const params = isAdmin ? { start_date: filterDate, end_date: filterDate } : {};
      const tasks = [reportService.list(params)];
      if (isAdmin) {
        tasks.push(reportService.dashboard({ period, date: filterDate }));
        tasks.push(reportService.pendingAgents({ date: filterDate, shift_name: pendingShift }));
      }
      const [reportData, dashboardData, pendingData] = await Promise.all(tasks);
      setReports(reportData);
      if (dashboardData) setDashboard(dashboardData);
      if (pendingData) setPendingAgents(pendingData);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load reports. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [filterDate, isAdmin, pendingShift, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = () => {
    logout();
    navigate(isAgent ? '/agent/login' : '/admin/login');
  };

  const beginNew = () => {
    setEditing(null);
    setForm(initialForm());
    if (offlineDraftKey) localStorage.removeItem(offlineDraftKey);
    setNotice('');
  };

  const beginEdit = (report) => {
    try {
      setEditing(report);
      setForm(readForm(report));
      setNotice('');
    } catch {
      setError('This report could not be opened. Refresh the report list and try again.');
    }
  };

  const saveDraft = async () => {
    if (!isOnline) {
      saveOfflineDraft();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = reportPayload(form);
      const saved = editing
        ? await reportService.update(editing.id, payload)
        : await reportService.create(payload);
      setEditing(await reportService.read(saved.id));
      if (offlineDraftKey) localStorage.removeItem(offlineDraftKey);
      setNotice('Draft saved. You can continue editing until you submit it.');
      await loadData();
      return saved;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save the report draft.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveOfflineDraft = () => {
    if (!offlineDraftKey) return;
    localStorage.setItem(offlineDraftKey, JSON.stringify({ form, savedAt: new Date().toISOString() }));
    setNotice('Draft saved on this device. Reconnect to sync or submit it.');
    setError('');
  };

  const submitReport = async () => {
    if (!isOnline) {
      saveOfflineDraft();
      setError('You are offline. The draft is saved on this device, but it has not been submitted.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = editing
        ? await reportService.update(editing.id, reportPayload(form))
        : await reportService.create(reportPayload(form));
      setEditing(await reportService.read(saved.id));
      await reportService.submit(saved.id);
      if (offlineDraftKey) localStorage.removeItem(offlineDraftKey);
      setEditing(null);
      setForm(initialForm());
      setNotice('Report submitted and locked for admin review.');
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit the report.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachments = async (event) => {
    if (!event.target.files?.length) return;
    if (!isOnline) {
      setError('Reconnect to upload the Excel proof file.');
      event.target.value = '';
      return;
    }
    setSaving(true);
    setError('');
    try {
      const report = editing || await reportService.create(reportPayload(form));
      setEditing(await reportService.read(report.id));
      await reportService.addAttachments(report.id, event.target.files);
      setEditing(await reportService.read(report.id));
      setNotice('Work-proof files attached to this draft.');
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not upload attachments.');
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  };

  const reviewReport = async (report, decision) => {
    setSaving(true);
    setError('');
    try {
      await reportService.review(report.id, { decision, note: reviewNotes[report.id] || '' });
      setReviewNotes((current) => ({ ...current, [report.id]: '' }));
      setNotice(decision === 'approved' ? 'Report approved.' : 'Report returned to the agent.');
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not review this report.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAudit = async (reportId) => {
    if (audit[reportId]) {
      setAudit((current) => ({ ...current, [reportId]: null }));
      return;
    }
    try {
      const events = await reportService.auditTrail(reportId);
      setAudit((current) => ({ ...current, [reportId]: events }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load the audit history.');
    }
  };

  const downloadAttachment = async (reportId, attachmentId, name) => {
    try {
      const blob = await reportService.downloadAttachment(reportId, attachmentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not download the attachment.');
    }
  };

  const exportReports = async (format) => {
    try {
      const blob = await reportService.export(format, { start_date: filterDate, end_date: filterDate });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `daily-reports-${filterDate}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not export reports.');
    }
  };

  if (loading) return <LoadingSpinner />;

  const pageTitle = isAgent ? 'My daily reports' : 'Daily report overview';
  const homePath = isAgent ? '/agent/orders' : '/admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-900 text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-5">
          <div>
            <p className="text-sm font-semibold text-gold-300">Station operations</p>
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
            <p className="mt-1 text-sm text-white/75">{user?.name}{user?.station_id ? ` · Station ${user.station_id}` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {isAgent && <Link to="/agent" className="rounded border border-white/40 px-3 py-2 text-sm">Workspace</Link>}
            {isAgent && <Link to="/agent/orders" className="rounded border border-white/40 px-3 py-2 text-sm">Orders</Link>}
            {isAgent && <Link to="/agent/billing" className="rounded border border-white/40 px-3 py-2 text-sm">Customer balances</Link>}
            {!isAgent && <Link to={homePath} className="rounded border border-white/40 px-3 py-2 text-sm">Dashboard</Link>}
            <button onClick={handleLogout} className="rounded border border-white/40 px-3 py-2 text-sm">Logout</button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
        {!isOnline && <div role="status" className="mb-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Offline mode: you can save a draft on this device. Reports cannot be submitted until you reconnect.</div>}
        {error && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

        {isAdmin && dashboard && (
          <section className="mb-8" aria-label="Report totals">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Report totals</h2>
                <p className="text-sm text-gray-600">{dashboard.start_date} to {dashboard.end_date}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input className="input-field !w-auto" type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} aria-label="Report date" />
                <select className="input-field !w-auto" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Summary period">
                  <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Reports" value={dashboard.totals?.report_count} />
              <Metric label="Approved" value={dashboard.totals?.approved_count} />
              <Metric label="Sales total" value={Number(dashboard.totals?.sales_total || 0).toLocaleString()} />
              <Metric label="Cash collected" value={Number(dashboard.totals?.cash_collected || 0).toLocaleString()} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="bg-white p-4 shadow-sm">
                <h3 className="mb-4 font-semibold text-gray-900">Sales by date</h3>
                <ReportBars items={dashboard.by_date || []} labelKey="report_date" valueKey="sales_total" />
              </section>
              <section className="bg-white p-4 shadow-sm">
                <h3 className="mb-4 font-semibold text-gray-900">Sales by agent</h3>
                <ReportBars items={dashboard.by_agent || []} labelKey="agent_name" valueKey="sales_total" />
              </section>
            </div>
            {isAdmin && (
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary" onClick={() => exportReports('xlsx')}>Export Excel</button>
                <button className="btn-secondary" onClick={() => exportReports('pdf')}>Export PDF</button>
              </div>
            )}
          </section>
        )}

        {isAgent && (
          <section className="mb-8 border-b border-gray-200 pb-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{editing ? `Report · ${editing.report_date}` : 'Shift report'}</h2>
                <p className="text-sm text-gray-600">Drafts can be edited. Submitting locks the report for review.</p>
              </div>
              {editing && <button className="btn-secondary" onClick={beginNew}>New draft</button>}
            </div>
            <div className="grid grid-cols-1 gap-4 rounded bg-white p-4 shadow-sm md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">Work date
                <input className="input-field mt-1" type="date" value={form.report_date} onChange={(event) => setForm({ ...form, report_date: event.target.value })} disabled={Boolean(editing && !['draft', 'returned'].includes(editing.status))} />
              </label>
              <label className="text-sm font-medium text-gray-700">Shift
                <input className="input-field mt-1" value={form.shift_name} maxLength={80} onChange={(event) => setForm({ ...form, shift_name: event.target.value })} disabled={Boolean(editing && !['draft', 'returned'].includes(editing.status))} />
              </label>
              <label className="text-sm font-medium text-gray-700">Sales total (RWF)
                <input className="input-field mt-1" type="number" min="0" step="0.01" value={form.sales_total} onChange={(event) => setForm({ ...form, sales_total: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-gray-700">Cash collected (RWF)
                <input className="input-field mt-1" type="number" min="0" step="0.01" value={form.cash_collected} onChange={(event) => setForm({ ...form, cash_collected: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-gray-700">Transactions
                <input className="input-field mt-1" type="number" min="0" step="1" value={form.transaction_count} onChange={(event) => setForm({ ...form, transaction_count: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-gray-700 md:col-span-2">Stock levels <span className="font-normal text-gray-500">(one item per line)</span>
                <textarea className="input-field mt-1 min-h-20" value={form.stock_levels} placeholder="Petrol: 3500 L\nLPG: 42 cylinders" onChange={(event) => setForm({ ...form, stock_levels: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-gray-700">Tasks completed
                <textarea className="input-field mt-1 min-h-24" value={form.tasks_done} placeholder="One task per line" onChange={(event) => setForm({ ...form, tasks_done: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-gray-700">Incidents and notes
                <textarea className="input-field mt-1 min-h-24" value={form.incidents} placeholder="Describe incidents or enter None" onChange={(event) => setForm({ ...form, incidents: event.target.value })} />
              </label>
              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <button className="btn-secondary" onClick={saveDraft} disabled={saving}>{saving ? 'Saving...' : 'Save draft'}</button>
                <button className="btn-secondary" onClick={saveOfflineDraft}>Save on this device</button>
                <button className="btn-primary" onClick={submitReport} disabled={saving}>{saving ? 'Submitting...' : 'Submit report'}</button>
                <label className="cursor-pointer text-sm font-semibold text-primary-700 hover:text-primary-900">
                  Attach Excel work proof (.xls, .xlsx)
                  <input className="sr-only" type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp,application/pdf" multiple onChange={uploadAttachments} disabled={saving} />
                </label>
                <span className="text-xs text-gray-500">An Excel proof file is required before submission. Max 10 MB each.</span>
                {editing?.status && <span className={`rounded px-2 py-1 text-xs font-semibold capitalize ${statusStyle[editing.status]}`}>{editing.status}</span>}
              </div>
              {editing?.review_note && <p className="md:col-span-2 rounded bg-red-50 p-3 text-sm text-red-800">Admin note: {editing.review_note}</p>}
              {editing?.attachments?.map((file) => <button key={file.id} className="text-left text-sm text-primary-700 underline" onClick={() => downloadAttachment(editing.id, file.id, file.original_name)}>{file.original_name}</button>)}
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="mb-8">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Agents awaiting submission</h2>
                <p className="text-sm text-gray-600">For {filterDate}</p>
              </div>
              <label className="text-sm font-medium text-gray-700">Shift
                <input className="input-field mt-1 !w-auto" value={pendingShift} maxLength={80} onChange={(event) => setPendingShift(event.target.value)} />
              </label>
            </div>
            {pendingAgents.length ? (
              <div className="divide-y divide-gray-200 bg-white px-4 shadow-sm">
                {pendingAgents.map((agent) => <div key={agent.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-medium">{agent.name} <span className="font-normal text-gray-500">{agent.email}</span></span><span className="text-amber-700">{agent.report_status || 'Not submitted'}</span></div>)}
              </div>
            ) : <p className="bg-white p-4 text-sm text-gray-600 shadow-sm">All assigned agents have submitted for this date.</p>}
          </section>
        )}

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">{isAgent ? 'My reports' : 'All reports'}</h2>
            <button className="text-sm font-semibold text-primary-700" onClick={loadData}>Refresh</button>
          </div>
          {!reports.length ? <div className="bg-white p-8 text-center text-sm text-gray-600 shadow-sm">No reports match this view.</div> : (
            <div className="space-y-4">
              {reports.map((report) => {
                const reportData = normalizeReportData(report.report_data);
                return (
                <article key={report.id} className="border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{report.report_date} · {report.shift_name}</h3>
                      <p className="text-sm text-gray-600">{report.station_name}{!isAgent && ` · ${report.agent_name}`}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs font-semibold capitalize ${statusStyle[report.status]}`}>{report.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                    <p><span className="text-gray-500">Sales:</span> {Number(report.sales_total).toLocaleString()} RWF</p>
                    <p><span className="text-gray-500">Cash:</span> {Number(report.cash_collected).toLocaleString()} RWF</p>
                    <p><span className="text-gray-500">Transactions:</span> {report.transaction_count}</p>
                    <button className="text-left font-semibold text-primary-700" onClick={() => toggleAudit(report.id)}>Audit history</button>
                  </div>
                  {report.review_note && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-800">Review note: {report.review_note}</p>}
                  {reportData.incidents && <p className="mt-2 text-sm"><span className="font-semibold">Incidents:</span> {reportData.incidents}</p>}
                  {Array.isArray(reportData.tasks_done) && reportData.tasks_done.length > 0 && <p className="mt-2 text-sm"><span className="font-semibold">Tasks:</span> {reportData.tasks_done.join(' · ')}</p>}
                  {Array.isArray(reportData.stock_levels) && reportData.stock_levels.length > 0 && <p className="mt-2 text-sm"><span className="font-semibold">Stock:</span> {reportData.stock_levels.map((item) => typeof item === 'string' ? item : `${item.product}: ${item.quantity} ${item.unit || ''}`).join(' · ')}</p>}
                  {report.attachments?.length > 0 && <div className="mt-3 flex flex-wrap gap-3">{report.attachments.map((file) => <button key={file.id} className="text-sm font-semibold text-primary-700 underline" onClick={() => downloadAttachment(report.id, file.id, file.original_name)}>{file.original_name}</button>)}</div>}
                  {audit[report.id] && <ol className="mt-3 space-y-1 border-l-2 border-gray-200 pl-3 text-xs text-gray-600">{audit[report.id].map((event) => <li key={event.id}>{new Date(event.created_at).toLocaleString()} · {event.actor_name || event.actor_role} · {event.action}{event.note ? ` · ${event.note}` : ''}</li>)}</ol>}
                  {isAgent && ['draft', 'returned'].includes(report.status) && <button className="mt-3 text-sm font-semibold text-primary-700" onClick={() => beginEdit(report)}>Continue editing</button>}
                  {isAdmin && report.status === 'submitted' && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 md:flex-row">
                      <input className="input-field" placeholder="Review note (required if returning)" value={reviewNotes[report.id] || ''} onChange={(event) => setReviewNotes({ ...reviewNotes, [report.id]: event.target.value })} />
                      <button className="btn-secondary" disabled={saving} onClick={() => reviewReport(report, 'returned')}>Return</button>
                      <button className="btn-primary" disabled={saving} onClick={() => reviewReport(report, 'approved')}>Approve</button>
                    </div>
                  )}
                </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DailyReports;