import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { careerService } from '../../services/careerService';
import { FaBriefcase, FaPlus, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';

const AdminCareers = () => {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCareer, setEditingCareer] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    employment_type: 'full-time',
    description: '',
    requirements: '',
    deadline: '',
    application_instructions: '',
    status: 'open'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    try {
      const data = await careerService.getAllCareers();
      setCareers(data);
    } catch (error) {
      console.error('Error fetching careers:', error);
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
      if (editingCareer) {
        await careerService.updateCareer(editingCareer.id, formData);
      } else {
        await careerService.createCareer(formData);
      }
      setShowModal(false);
      setEditingCareer(null);
      setFormData({
        title: '',
        department: '',
        location: '',
        employment_type: 'full-time',
        description: '',
        requirements: '',
        deadline: '',
        application_instructions: '',
        status: 'open'
      });
      fetchCareers();
    } catch (error) {
      console.error('Error saving career:', error);
    }
  };

  const handleEdit = (career) => {
    setEditingCareer(career);
    setFormData(career);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      try {
        await careerService.deleteCareer(id);
        fetchCareers();
      } catch (error) {
        console.error('Error deleting career:', error);
      }
    }
  };

  const handleAddNew = () => {
    setEditingCareer(null);
    setFormData({
      title: '',
      department: '',
      location: '',
      employment_type: 'full-time',
      description: '',
      requirements: '',
      deadline: '',
      application_instructions: '',
      status: 'open'
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
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')} className="text-gray-600 hover:text-energy-600">
              <FaArrowLeft />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Manage Careers</h1>
          </div>
          <button onClick={handleAddNew} className="btn-primary flex items-center space-x-2">
            <FaPlus />
            <span>Add Job</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {careers.map((career) => (
                <tr key={career.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaBriefcase className="text-energy-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{career.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {career.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {career.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {career.employment_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      career.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {career.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(career)} className="text-energy-600 hover:text-energy-900">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(career.id)} className="text-red-600 hover:text-red-900">
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
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingCareer ? 'Edit Job' : 'Add New Job'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="career-title" className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                  <input id="career-title" type="text" name="title" value={formData.title} onChange={handleChange} required className="input-field" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="career-department" className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                    <input id="career-department" type="text" name="department" value={formData.department} onChange={handleChange} required className="input-field" />
                  </div>
                  <div>
                    <label htmlFor="career-location" className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                    <input id="career-location" type="text" name="location" value={formData.location} onChange={handleChange} required className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="career-employment-type" className="block text-sm font-medium text-gray-700 mb-2">Employment Type *</label>
                    <select id="career-employment-type" name="employment_type" value={formData.employment_type} onChange={handleChange} required className="input-field">
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="career-deadline" className="block text-sm font-medium text-gray-700 mb-2">Application Deadline</label>
                    <input id="career-deadline" type="date" name="deadline" value={formData.deadline} onChange={handleChange} className="input-field" />
                  </div>
                </div>
                <div>
                  <label htmlFor="career-description" className="block text-sm font-medium text-gray-700 mb-2">Job Description *</label>
                  <textarea id="career-description" name="description" value={formData.description} onChange={handleChange} rows={6} required className="input-field"></textarea>
                </div>
                <div>
                  <label htmlFor="career-requirements" className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                  <textarea id="career-requirements" name="requirements" value={formData.requirements} onChange={handleChange} rows={4} className="input-field"></textarea>
                </div>
                <div>
                  <label htmlFor="career-application-instructions" className="block text-sm font-medium text-gray-700 mb-2">Application Instructions</label>
                  <textarea id="career-application-instructions" name="application_instructions" value={formData.application_instructions} onChange={handleChange} rows={3} className="input-field"></textarea>
                </div>
                <div>
                  <label htmlFor="career-status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select id="career-status" name="status" value={formData.status} onChange={handleChange} className="input-field">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingCareer ? 'Update' : 'Create'} Job
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

export default AdminCareers;