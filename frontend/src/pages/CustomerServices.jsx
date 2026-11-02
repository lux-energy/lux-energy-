import React, { useEffect, useState } from 'react';
import { serviceService } from '../services/serviceService';
import { stationService } from '../services/stationService';
import { portalService } from '../services/portalService';
import LoadingSpinner from '../components/LoadingSpinner';
import CustomerPortalLayout from '../layouts/CustomerPortalLayout';

const CustomerServices = () => {
  const [catalog, setCatalog] = useState([]);
  const [mine, setMine] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stationId, setStationId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [services, subscribed, stationData] = await Promise.all([
      serviceService.getAllServices(),
      portalService.getMyServices(),
      stationService.getAllStations()
    ]);
    setCatalog(services);
    setMine(subscribed);
    setStations(stationData);
    if (stationData.length > 0) setStationId(String(stationData[0].id));
  };

  useEffect(() => {
    load()
      .catch(() => setError('Unable to load services.'))
      .finally(() => setLoading(false));
  }, []);

  const subscribedIds = new Set(mine.map((s) => s.service_id));

  const subscribe = async (serviceId) => {
    setMessage('');
    setError('');
    try {
      await portalService.subscribeService({
        service_id: serviceId,
        station_id: stationId ? Number(stationId) : null
      });
      await load();
      setMessage('Service activated. Your selected station can now view it.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to subscribe.');
    }
  };

  const updateStatus = async (id, status) => {
    setMessage('');
    setError('');
    try {
      await portalService.updateMyService(id, { status });
      await load();
      setMessage(`Service ${status}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update service.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <CustomerPortalLayout
      title="Manage energy services"
      subtitle="Activate, pause, or cancel self-service energy offerings."
    >
      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 bg-white rounded-lg shadow-md p-4 max-w-md">
        <label htmlFor="preferred-station" className="block text-sm font-medium text-gray-700 mb-2">Preferred station</label>
        <select id="preferred-station" className="input-field" value={stationId} onChange={(e) => setStationId(e.target.value)}>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <h2 className="text-xl font-bold mb-4">Your active services</h2>
      {mine.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-gray-600 mb-10">No active services yet. Subscribe below.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {mine.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  {item.station_name && <p className="text-sm text-primary-700 mt-2">Station: {item.station_name}</p>}
                </div>
                <span className="px-3 py-1 h-fit rounded-full bg-gold-100 text-gold-700 text-sm font-semibold">{item.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {item.status === 'active' && (
                  <button className="btn-secondary text-sm" onClick={() => updateStatus(item.id, 'paused')}>Pause</button>
                )}
                {item.status === 'paused' && (
                  <button className="btn-primary text-sm" onClick={() => updateStatus(item.id, 'active')}>Resume</button>
                )}
                <button
                  className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => updateStatus(item.id, 'cancelled')}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Available services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalog.filter((s) => !subscribedIds.has(s.id)).map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow-md p-5">
            <h3 className="font-semibold text-lg">{service.title}</h3>
            <p className="text-sm text-gray-600 mt-2">{service.description}</p>
            <button className="btn-primary mt-4 w-full" onClick={() => subscribe(service.id)}>
              Activate service
            </button>
          </div>
        ))}
        {catalog.filter((s) => !subscribedIds.has(s.id)).length === 0 && (
          <p className="text-gray-600">You already have every available service.</p>
        )}
      </div>
    </CustomerPortalLayout>
  );
};

export default CustomerServices;
