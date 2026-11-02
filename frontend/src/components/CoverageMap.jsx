import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#8B1538;border:2px solid #fff;transform:rotate(-45deg);
    box-shadow:0 2px 6px rgba(0,0,0,.35);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

const CoverageMap = ({ stations = [], selectedId, onSelect }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [-1.94, 29.87],
      zoom: 8,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(mapInstance.current);

    markersLayer.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();
    const withCoords = stations.filter(
      (s) => s.latitude != null && s.longitude != null && !Number.isNaN(Number(s.latitude))
    );

    withCoords.forEach((station) => {
      const marker = L.marker([Number(station.latitude), Number(station.longitude)], {
        icon: markerIcon
      });
      marker.bindPopup(
        `<strong>${station.name}</strong><br/>${station.province}, ${station.district}<br/>${station.address || ''}`
      );
      marker.on('click', () => {
        if (onSelect) onSelect(station);
      });
      markersLayer.current.addLayer(marker);
    });

    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(
        withCoords.map((s) => [Number(s.latitude), Number(s.longitude)])
      );
      mapInstance.current.fitBounds(bounds.pad(0.2));
    }
  }, [stations, onSelect]);

  useEffect(() => {
    if (!mapInstance.current || !selectedId) return;
    const station = stations.find((s) => s.id === selectedId);
    if (station?.latitude != null && station?.longitude != null) {
      mapInstance.current.setView(
        [Number(station.latitude), Number(station.longitude)],
        12,
        { animate: true }
      );
    }
  }, [selectedId, stations]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[420px] md:h-[520px] rounded-lg overflow-hidden border border-gray-200 shadow-sm z-0"
    />
  );
};

export default CoverageMap;
