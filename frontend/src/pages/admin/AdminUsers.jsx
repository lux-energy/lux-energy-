import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { adminOpsService } from '../../services/portalService';
import { stationService } from '../../services/stationService';

const emptyForm = {
  name: '', email: '', phone: '', password: '', role: 'customer', station_id: '', status: 'active'
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const [userData, stationData] = await Promise.all([
        adminOpsService.getUsers(roleFilter || undefined),
        stationService.getAllStations()
      ]);
      setUsers(userData);
      setStations(stationData);
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Could not load users. Check your connection and try again.');
    }
  }, [roleFilter]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '',
      role: user.role,
      station_id: user.station_id || '',
      status: user.status
    });
    setError('');
    setShowModal(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        station_id: form.role === 'agent' ? Number(form.station_id) : null
      };
      if (editing) {
        if (!payload.password) delete payload.password;
        await adminOpsService.updateUser(editing.id, payload);
      } else {
        await adminOpsService.createUser(payload);
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save user.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await adminOpsService.deleteUser(id);
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')} className="text-gray-600 hover:text-energy-600">
              <FaArrowLeft />
            </button>
            <h1 className="text-xl font-bold text-gray-900">User Directory</h1>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FaPlus /> Add user
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <select className="input-field max-w-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            <option value="customer">Customers</option>
            <option value="agent">Agents</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email} · {user.phone}</div>
                  </td>
                  <td className="px-6 py-4 capitalize">{user.role}</td>
                  <td className="px-6 py-4">{user.station_name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{user.status}</span>
                  </td>
                  <td className="px-6 py-4 space-x-3">
                    <button onClick={() => openEdit(user)} className="text-energy-600 hover:text-energy-800"><FaEdit /></button>
                    <button onClick={() => remove(user.id)} className="text-red-600 hover:text-red-800"><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={save} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-xl font-bold">{editing ? 'Edit user' : 'Add user'}</h2>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <input className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className="input-field" type="password" placeholder={editing ? 'New password (optional)' : 'Password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="customer">Customer</option>
              <option value="agent">Agent</option>
            </select>
            {form.role === 'agent' && (
              <select className="input-field" value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })} required>
                <option value="">Assign station</option>
                {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
