import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { adminOpsService } from '../../services/portalService';

const AdminTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('open');

  const load = async () => {
    setTickets(await adminOpsService.getTickets());
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openTicket = (ticket) => {
    setSelected(ticket);
    setNotes(ticket.admin_notes || '');
    setStatus(ticket.status);
  };

  const save = async () => {
    if (!selected) return;
    await adminOpsService.updateTicket(selected.id, { status, admin_notes: notes });
    setSelected(null);
    await load();
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
        <div className="container mx-auto px-4 py-4 flex items-center space-x-4">
          <button onClick={() => navigate('/admin')} className="text-gray-600 hover:text-energy-600">
            <FaArrowLeft />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{ticket.subject}</div>
                    <div className="text-sm text-gray-500 capitalize">{ticket.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{ticket.customer_name}</div>
                    <div className="text-sm text-gray-500">{ticket.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 capitalize">{ticket.priority}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full bg-gold-100 text-gold-700 text-xs font-semibold">{ticket.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-energy-600 font-medium" onClick={() => openTicket(ticket)}>Manage</button>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No tickets yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-xl font-bold">{selected.subject}</h2>
            <p className="text-sm text-gray-600">{selected.description}</p>
            <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Admin notes / reply"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTickets;
