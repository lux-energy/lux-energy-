import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceService } from '../../services/serviceService';
import { FaConciergeBell, FaPlus, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    detailed_description: '',
    image: '',
    icon: '',
    status: 'active'
  });
  const [imageFile, setImageFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await serviceService.getAllServices();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
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

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataObj = new FormData();
      Object.keys(formData).forEach(key => {
        formDataObj.append(key, formData[key]);
      });
      if (imageFile) {
        formDataObj.append('image', imageFile);
      }

      if (editingService) {
        await serviceService.updateService(editingService.id, formDataObj);
      } else {
        await serviceService.createService(formDataObj);
      }
      setShowModal(false);
      setEditingService(null);
      setFormData({
        title: '',
        description: '',
        detailed_description: '',
        image: '',
        icon: '',
        status: 'active'
      });
      setImageFile(null);
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData(service);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await serviceService.deleteService(id);
        fetchServices();
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({
      title: '',
      description: '',
      detailed_description: '',
      image: '',
      icon: '',
      status: 'active'
    });
    setImageFile(null);
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
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')} className="text-gray-600 hover:text-energy-600">
              <FaArrowLeft />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Manage Services</h1>
          </div>
          <button onClick={handleAddNew} className="btn-primary flex items-center space-x-2">
            <FaPlus />
            <span>Add Service</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaConciergeBell className="text-energy-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{service.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {service.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.icon}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      service.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(service)} className="text-energy-600 hover:text-energy-900">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-900">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="service-title" className="block text-sm font-medium text-gray-700 mb-2">Service Title *</label>
                  <input id="service-title" type="text" name="title" value={formData.title} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label htmlFor="service-description" className="block text-sm font-medium text-gray-700 mb-2">Short Description *</label>
                  <textarea id="service-description" name="description" value={formData.description} onChange={handleChange} rows={2} required className="input-field"></textarea>
                </div>
                <div>
                  <label htmlFor="service-detailed-description" className="block text-sm font-medium text-gray-700 mb-2">Detailed Description</label>
                  <textarea id="service-detailed-description" name="detailed_description" value={formData.detailed_description} onChange={handleChange} rows={4} className="input-field"></textarea>
                </div>
                <div>
                  <label htmlFor="service-icon" className="block text-sm font-medium text-gray-700 mb-2">Icon (emoji or icon name)</label>
                  <input id="service-icon" type="text" name="icon" value={formData.icon} onChange={handleChange} className="input-field" placeholder="⛽ or fuel-pump" />
                </div>
                <div>
                  <label htmlFor="service-image" className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <input id="service-image" type="file" onChange={handleImageChange} accept="image/*" className="input-field" />
                </div>
                <div>
                  <label htmlFor="service-status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select id="service-status" name="status" value={formData.status} onChange={handleChange} className="input-field">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingService ? 'Update' : 'Create'} Service
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

export default AdminServices;