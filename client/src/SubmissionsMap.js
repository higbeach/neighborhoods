import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const SubmissionsMap = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [submissions, setSubmissions] = useState(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);

  // Fetch live submissions from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://neighborhoods-lgvg.onrender.com/api/submissions');
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        setSubmissions(data);
      } catch (err) {
        console.error('❌ Error loading submissions:', err);
      }
    };

    fetchData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.33, 47.61],
      zoom: 11,
    });
  }, []);

  // Add/update submissions layer
  useEffect(() => {
    if (!mapRef.current || !submissions) return;

    if (mapRef.current.getSource('submissions')) {
      mapRef.current.getSource('submissions').setData(submissions);
    } else {
      mapRef.current.addSource('submissions', {
        type: 'geojson',
        data: submissions,
      });

      // Fill layer with conditional styling based on feature-state
      mapRef.current.addLayer({
        id: 'submissions-fill',
        type: 'fill',
        source: 'submissions',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f00', // red if selected
            '#088'  // teal otherwise
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.6,
            0.4
          ]
        },
      });

      mapRef.current.addLayer({
        id: 'submissions-outline',
        type: 'line',
        source: 'submissions',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f00',
            '#000'
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            1
          ]
        },
      });

      // Popup + highlight on click
      mapRef.current.on('click', 'submissions-fill', (e) => {
        if (!e.features.length) return;
        const feature = e.features[0];
        const props = feature.properties;
        const id = feature.id; // ✅ stable id from backend

        // Clear previous selection
        if (selectedFeatureId !== null) {
          mapRef.current.setFeatureState(
            { source: 'submissions', id: selectedFeatureId },
            { selected: false }
          );
        }

        // Set new selection
        setSelectedFeatureId(id);
        mapRef.current.setFeatureState(
          { source: 'submissions', id },
          { selected: true }
        );

        // Show popup
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>${props.neighborhood || 'Unnamed'}</strong><br/>
            ${props.years || ''} years<br/>
            ${props.comments || 'No comments'}<br/>
            <small>${props.timestamp || ''}</small>
          `)
          .addTo(mapRef.current);
      });

      // Cursor change on hover
      mapRef.current.on('mouseenter', 'submissions-fill', () => {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      });
      mapRef.current.on('mouseleave', 'submissions-fill', () => {
        mapRef.current.getCanvas().style.cursor = '';
      });
    }
  }, [submissions, selectedFeatureId]);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
};

export default SubmissionsMap;