import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const SubmissionsMap = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // Load submissions.geojson once
  useEffect(() => {
    fetch('/data/submissions.geojson')
      .then((res) => res.json())
      .then((data) => {
        if (data.type === 'FeatureCollection') {
          setSubmissions(data.features);
        } else {
          console.error('Invalid GeoJSON format');
        }
      })
      .catch((err) => console.error('Error loading submissions:', err));
  }, []);

  // Initialize map and add sources/layers
  useEffect(() => {
    if (mapRef.current || submissions.length === 0) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.33, 47.61],
      zoom: 11,
    });

    mapRef.current.on('load', () => {
      submissions.forEach((f, index) => {
        const sourceId =
          f.properties && f.properties.id
            ? `boundary-${f.properties.id}`
            : `boundary-fallback-${index}`;

        if (!mapRef.current.getSource(sourceId)) {
          mapRef.current.addSource(sourceId, {
            type: 'geojson',
            data: f,
          });

          mapRef.current.addLayer({
            id: sourceId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#088',
              'fill-opacity': 0.4,
            },
          });

          mapRef.current.addLayer({
            id: `${sourceId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#000',
              'line-width': 1,
            },
          });

          mapRef.current.on('click', sourceId, (e) => {
            setSelectedId(f.properties.id || index);

            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <strong>${f.properties.neighborhood || 'Unnamed'}</strong><br/>
                ${f.properties.years || ''} years<br/>
                ${f.properties.comments || 'No comments'}<br/>
                <small>${f.properties.timestamp || ''}</small>
              `)
              .addTo(mapRef.current);
          });
        }
      });
    });
  }, [submissions]);

  // Update styles when selection changes
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    submissions.forEach((f, index) => {
      const sourceId =
        f.properties && f.properties.id
          ? `boundary-${f.properties.id}`
          : `boundary-fallback-${index}`;

      const isSelected = (f.properties.id || index) === selectedId;

      if (mapRef.current.getLayer(sourceId)) {
        mapRef.current.setPaintProperty(
          sourceId,
          'fill-color',
          isSelected ? '#f00' : '#088'
        );
        mapRef.current.setPaintProperty(
          sourceId,
          'fill-opacity',
          isSelected ? 0.6 : 0.4
        );
      }

      if (mapRef.current.getLayer(`${sourceId}-outline`)) {
        mapRef.current.setPaintProperty(
          `${sourceId}-outline`,
          'line-color',
          isSelected ? '#f00' : '#000'
        );
        mapRef.current.setPaintProperty(
          `${sourceId}-outline`,
          'line-width',
          isSelected ? 3 : 1
        );
      }
    });
  }, [selectedId, submissions]);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
};

export default SubmissionsMap;