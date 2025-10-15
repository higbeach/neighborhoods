import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const SubmissionsMap = ({ submissions }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.33, 47.61],
      zoom: 11,
    });

    mapRef.current.on('load', () => {
      console.log('🗺️ Map style loaded');
      setMapLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || !submissions || !mapLoaded) return;

    const map = mapRef.current;

    // 🔴 Extract home location pins from lat/lon
    const locationFeatures = submissions.features
      .filter((f) => typeof f.properties.lat === 'number' && typeof f.properties.lon === 'number')
      .map((f, idx) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [f.properties.lon, f.properties.lat],
        },
        properties: {
          neighborhood: f.properties.neighborhood,
          comments: f.properties.comments,
          timestamp: f.properties.timestamp,
        },
        id: `loc-${idx}`,
      }));

    const locationGeoJSON = {
      type: 'FeatureCollection',
      features: locationFeatures,
    };

    // 🟦 Add or update polygon boundaries
    if (map.getSource('submissions')) {
      map.getSource('submissions').setData(submissions);
    } else {
      map.addSource('submissions', {
        type: 'geojson',
        data: submissions,
      });

      map.addLayer({
        id: 'submissions-fill',
        type: 'fill',
        source: 'submissions',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f00',
            '#088',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.6,
            0.4,
          ],
        },
      });

      map.addLayer({
        id: 'submissions-outline',
        type: 'line',
        source: 'submissions',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#f00',
            '#000',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            1,
          ],
        },
      });

      map.on('click', 'submissions-fill', (e) => {
        if (!e.features.length) return;
        const feature = e.features[0];
        const props = feature.properties || {};
        const id = feature.id;

        if (selectedFeatureId !== null && selectedFeatureId !== id) {
          map.setFeatureState(
            { source: 'submissions', id: selectedFeatureId },
            { selected: false }
          );
        }

        if (id !== undefined && id !== null) {
          setSelectedFeatureId(id);
          map.setFeatureState({ source: 'submissions', id }, { selected: true });
        }

        const popupHTML = `
          <strong>${props.neighborhood || props.location || 'Unnamed'}</strong><br/>
          ${props.comments ? `${props.comments} comment${props.comments > 1 ? 's' : ''}` : 'No comments'}<br/>
          <small>${props.timestamp || ''}</small>
        `;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupHTML)
          .addTo(map);
      });

      map.on('mouseenter', 'submissions-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'submissions-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    // 🔴 Add or update location pin layer
    if (map.getSource('home-locations')) {
      map.getSource('home-locations').setData(locationGeoJSON);
    } else {
      map.addSource('home-locations', {
        type: 'geojson',
        data: locationGeoJSON,
      });

      map.addLayer({
        id: 'home-location-pins',
        type: 'symbol',
        source: 'home-locations',
        layout: {
          'icon-image': 'marker-15',
          'icon-size': 1.2,
          'icon-allow-overlap': true,
        },
      });
    }
  }, [submissions, mapLoaded, selectedFeatureId]);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
};

export default SubmissionsMap;