import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stationService } from '../../services/stationService';
import { FaGasPump, FaPlus, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';

const AdminStations = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    province: '',
    district: '',
    sector: '',
    address: '',
    phone: '',
    opening_hours: '',
    latitude: '',
    longitude: '',
    services_available: '',
    status: 'active'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const data = await stationService.getAllStations();
      setStations(data);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStation) {
        await stationService.updateStation(editingStation.id, formData);
      } else {
        await stationService.createStation(formData);
      }
      setShowModal(false);
      setEditingStation(null);
      setFormData({
        name: '',
        province: '',
        district: '',
        sector: '',
        address: '',
        phone: '',
        opening_hours: '',
        latitude: '',
        longitude: '',
        services_available: '',
        status: 'active'
      });
      fetchStations();
    } catch (error) {
      console.error('Error saving station:', error);
    }
  };

  const handleEdit = (station) => {
    setEditingStation(station);
    setFormData(station);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      try {
        await stationService.deleteStation(id);
        fetchStations();
      } catch (error) {
        console.error('Error deleting station:', error);
      }
    }
  };

  const handleAddNew = () => {
    setEditingStation(null);
    setFormData({
      name: '',
      province: '',
      district: '',
      sector: '',
      address: '',
      phone: '',
      opening_hours: '',
      latitude: '',
      longitude: '',
      services_available: '',
      status: 'active'
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-energy-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')} className="text-gray-600 hover:text-energy-600">
              <FaArrowLeft />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Manage Stations</h1>
          </div>
          <button
            onClick={handleAddNew}
            className="btn-primary flex items-center space-x-2"
          >
            <FaPlus />
            <span>Add Station</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stations.map((station) => (
                <tr key={station.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaGasPump className="text-energy-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{station.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{station.province}, {station.district}</div>
                    <div className="text-sm text-gray-500">{station.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {station.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      station.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {station.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(station)}
                      className="text-energy-600 hover:text-energy-900"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(station.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingStation ? 'Edit Station' : 'Add New Station'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="station-name" className="block text-sm font-medium text-gray-700 mb-2">Station Name *</label>
                  <input
                    id="station-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="station-province" className="block text-sm font-medium text-gray-700 mb-2">Province *</label>
                    <input
                      id="station-province"
                      type="text"
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="station-district" className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                    <input
                      id="station-district"
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="station-sector" className="block text-sm font-medium text-gray-700 mb-2">Sector *</label>
                    <input
                      id="station-sector"
                      type="text"
                      name="sector"
                      value={formData.sector}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="station-address" className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                  <input
                    id="station-address"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="station-phone" className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      id="station-phone"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="station-opening-hours" className="block text-sm font-medium text-gray-700 mb-2">Opening Hours</label>
                    <input
                      id="station-opening-hours"
                      type="text"
                      name="opening_hours"
                      value={formData.opening_hours}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="station-latitude" className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                    <input
                      id="station-latitude"
                      type="text"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="station-longitude" className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                    <input
                      id="station-longitude"
                      type="text"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="station-services" className="block text-sm font-medium text-gray-700 mb-2">Services Available</label>
                  <textarea
                    id="station-services"
                    name="services_available"
                    value={formData.services_available}
                    onChange={handleChange}
                    rows={3}
                    className="input-field"
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="station-status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    id="station-status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingStation ? 'Update' : 'Create'} Station
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStations;