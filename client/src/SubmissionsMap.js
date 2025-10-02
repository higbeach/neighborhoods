import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZXJpY2hvbG1lcyIsImEiOiJjbGZxZ2Z6Z3gwN3ZkM3BvM3Z0Z3Z2Z2ZxIn0.4ZJvZzXJv8XzJvZzXJv8XzQ';

const SubmissionsMap = ({ submissions }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.33, 47.61],
      zoom: 11,
    });

    mapRef.current.on('load', () => {
      submissions.forEach((s) => {
        if (s.boundary && s.boundary.geometry) {
          mapRef.current.addSource(`boundary-${s._id}`, {
            type: 'geojson',
            data: s.boundary,
          });

          mapRef.current.addLayer({
            id: `boundary-${s._id}`,
            type: 'fill',
            source: `boundary-${s._id}`,
            paint: {
              'fill-color': '#088',
              'fill-opacity': 0.4,
            },
          });
        }

        if (s.location && s.location.lng && s.location.lat) {
          new mapboxgl.Marker()
            .setLngLat([s.location.lng, s.location.lat])
            .setPopup(new mapboxgl.Popup().setText(s.areaName || 'Unnamed'))
            .addTo(mapRef.current);
        }
      });
    });
  }, [submissions]);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
};

export default SubmissionsMap;