import React, { useEffect, useState } from 'react';
import { FaGasPump, FaMapMarkerAlt, FaPhone, FaClock, FaFilter } from 'react-icons/fa';
import { stationService } from '../services/stationService';
import LoadingSpinner from '../components/LoadingSpinner';
import CoverageMap from '../components/CoverageMap';

const STATIONS_CACHE_KEY = 'lux-energy-stations';

const Stations = () => {
  const [stations, setStations] = useState(() => {
    try {
      const cachedStations = localStorage.getItem(STATIONS_CACHE_KEY);
      const parsedStations = cachedStations ? JSON.parse(cachedStations) : [];
      return Array.isArray(parsedStations) ? parsedStations : [];
    } catch (error) {
      console.error('Error reading cached stations:', error);
      return [];
    }
  });
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem(STATIONS_CACHE_KEY);
    } catch (error) {
      return true;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStationId, setSelectedStationId] = useState(null);

  const provinces = ['Kigali', 'Northern', 'Southern', 'Eastern', 'Western'];

  useEffect(() => {
    const fetchStations = async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const data = await stationService.getAllStations();
          if (!Array.isArray(data)) {
            throw new Error('Invalid stations response');
          }

          setStations(data);
          localStorage.setItem(STATIONS_CACHE_KEY, JSON.stringify(data));
          setLoading(false);
          return;
        } catch (error) {
          if (attempt === 3) {
            console.error('Error fetching stations:', error);
          }
        }
      }

      setLoading(false);
    };

    fetchStations();
  }, []);

  useEffect(() => {
    let filtered = stations;

    if (searchTerm) {
      filtered = filtered.filter(station =>
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.sector.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedProvince) {
      filtered = filtered.filter(station => station.province === selectedProvince);
    }

    setFilteredStations(filtered);
  }, [searchTerm, selectedProvince, stations]);

  const openGoogleMaps = (latitude, longitude) => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Find a Station</h1>
          <p className="text-xl text-gray-100">Interactive nationwide coverage map across Rwanda</p>
        </div>
      </section>

      <section className="py-8 bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="station-search" className="block text-sm font-medium text-gray-700 mb-2">Search Stations</label>
              <input
                id="station-search"
                type="text"
                placeholder="Search by name, district, or sector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="station-province" className="block text-sm font-medium text-gray-700 mb-2">Filter by Province</label>
              <select
                id="station-province"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="input-field"
              >
                <option value="">All Provinces</option>
                {provinces.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setSearchTerm(''); setSelectedProvince(''); setSelectedStationId(null); }}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <FaFilter className="inline mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="mb-4 flex flex-wrap justify-between gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Nationwide Coverage Map</h2>
            <p className="text-gray-600 text-sm self-end">
              Showing {filteredStations.length} of {stations.length} stations — click a pin or card to focus
            </p>
          </div>
          <CoverageMap
            stations={filteredStations}
            selectedId={selectedStationId}
            onSelect={(station) => setSelectedStationId(station.id)}
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            {provinces.map(province => (
              <button
                key={province}
                type="button"
                onClick={() => setSelectedProvince(province === selectedProvince ? '' : province)}
                className={`p-4 rounded-lg text-left transition-colors ${
                  selectedProvince === province ? 'bg-primary-800 text-white' : 'bg-white shadow-sm hover:bg-gold-50'
                }`}
              >
                <div className={`font-semibold ${selectedProvince === province ? 'text-gold-300' : 'text-energy-600'}`}>
                  {province}
                </div>
                <div className={`text-sm ${selectedProvince === province ? 'text-gray-200' : 'text-gray-600'}`}>
                  {stations.filter(s => s.province === province).length} stations
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          {filteredStations.length === 0 ? (
            <div className="text-center py-12">
              <FaGasPump className="text-gray-400 text-5xl mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No stations found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStations.map((station) => (
                <article
                  key={station.id}
                  className={`card transition-shadow ${
                    selectedStationId === station.id ? 'ring-2 ring-primary-600 shadow-lg' : ''
                  }`}
                >
                  <div className="h-40 bg-gradient-to-br from-gold-100 to-gold-200 rounded-lg mb-4 flex items-center justify-center">
                    <FaGasPump className="text-gold-600 text-5xl" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{station.name}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start">
                      <FaMapMarkerAlt className="text-primary-600 mt-1 mr-2" />
                      <span>{station.address}</span>
                    </div>
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-primary-600 mr-2" />
                      <span>{station.province}, {station.district}</span>
                    </div>
                    {station.phone && (
                      <div className="flex items-center">
                        <FaPhone className="text-gold-600 mr-2" />
                        <span>{station.phone}</span>
                      </div>
                    )}
                    {station.opening_hours && (
                      <div className="flex items-center">
                        <FaClock className="text-orange-600 mr-2" />
                        <span>{station.opening_hours}</span>
                      </div>
                    )}
                  </div>
                  {station.services_available && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-2">Services:</p>
                      <p className="text-sm text-gray-600">{station.services_available}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedStationId(station.id)}
                    aria-pressed={selectedStationId === station.id}
                    className="w-full mt-4 border border-primary-600 text-primary-700 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    {selectedStationId === station.id ? 'Showing on map' : 'Show on map'}
                  </button>
                  {station.latitude && station.longitude && (
                    <button
                      type="button"
                      onClick={() => {
                        openGoogleMaps(station.latitude, station.longitude);
                      }}
                      className="w-full mt-4 bg-energy-600 text-white px-4 py-2 rounded-lg hover:bg-energy-700 transition-colors"
                    >
                      Get Directions
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Stations;
