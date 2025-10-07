import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const SubmissionsMap = ({ submissions }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);

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

      mapRef.current.addLayer({
        id: 'submissions-fill',
        type: 'fill',
        source: 'submissions',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f00',
            '#088'
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

      mapRef.current.on('click', 'submissions-fill', (e) => {
        if (!e.features.length) return;
        const feature = e.features[0];
        const props = feature.properties;
        const id = feature.id;

        if (selectedFeatureId !== null) {
          mapRef.current.setFeatureState(
            { source: 'submissions', id: selectedFeatureId },
            { selected: false }
          );
        }

        setSelectedFeatureId(id);
        mapRef.current.setFeatureState(
          { source: 'submissions', id },
          { selected: true }
        );

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