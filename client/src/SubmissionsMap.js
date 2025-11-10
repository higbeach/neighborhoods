import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const SubmissionsMap = ({ submissions }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.33, 47.61],
      zoom: 11,
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || !submissions) return;

    const map = mapRef.current;
    const activeFeatures = submissions.features.filter(f => f.properties.archived !== true);

    const neighborhoodColors = {};
    const colorPalette = [
      '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
      '#911eb4', '#46f0f0', '#f032e6', '#bcf60c',
      '#008080', '#396139', '#9a6324', '#800000'
    ];
    let colorIndex = 0;

    console.log('🆔 Assigned feature IDs:', activeFeatures.map(f => f.id));

    activeFeatures.forEach((f) => {
      const name = f.properties.neighborhood || 'Unknown';
      if (!neighborhoodColors[name]) {
        neighborhoodColors[name] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
      }
      f.properties.neighborhoodColor = neighborhoodColors[name];
    });

    const locationFeatures = activeFeatures
      .filter(f => f.properties.location?.lat && f.properties.location?.lng)
      .map(f => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [f.properties.location.lng, f.properties.location.lat],
        },
        properties: {
          neighborhood: f.properties.neighborhood,
          comments: f.properties.comments,
          created_at: f.properties.created_at,
          years: f.properties.years,
          parentId: f.id,
          color: f.properties.neighborhoodColor
        },
        id: `loc-${f.id}`,
      }));

    const locationGeoJSON = {
      type: 'FeatureCollection',
      features: locationFeatures,
    };
        map.once('load', () => {
      map.addSource('submissions', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: activeFeatures
        }
      });

      activeFeatures.forEach((f) => {
        if (f.id) {
          map.setFeatureState({ source: 'submissions', id: f.id }, { selected: false });
        }
      });

      map.addLayer({
        id: 'submissions-outline',
        type: 'line',
        source: 'submissions',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ff0000',
            ['get', 'neighborhoodColor']
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            5,
            3
          ],
        },
      });

      map.on('click', 'submissions-outline', (e) => {
        console.log('🖱️ Boundary clicked:', e.features[0]);

        const feature = e.features[0];
        const id = feature.id || feature.properties.id; // ✅ fallback
        const props = feature.properties || {};

        if (!id) {
          console.warn('⚠️ No ID found for clicked feature:', feature);
          return;
        }

        if (selectedFeatureId && selectedFeatureId !== id) {
          map.setFeatureState({ source: 'submissions', id: selectedFeatureId }, { selected: false });
          map.setFeatureState({ source: 'home-locations', id: `loc-${selectedFeatureId}` }, { selected: false });
        }

        setSelectedFeatureId(id);
        map.setFeatureState({ source: 'submissions', id }, { selected: true });
        map.setFeatureState({ source: 'home-locations', id: `loc-${id}` }, { selected: true });

        const formattedDate = props.created_at
          ? new Date(props.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
          : '—';

        const popupHTML = `
          <strong>${props.neighborhood || 'Unnamed'}</strong><br/>
          ${props.comments || 'No comments'}<br/>
          <small><strong>Submitted:</strong> ${formattedDate}</small><br/>
          <small><strong>Years:</strong> ${props.years || '—'}</small>
        `;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupHTML)
          .addTo(map);
      });

      map.on('mouseenter', 'submissions-outline', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'submissions-outline', () => {
        map.getCanvas().style.cursor = '';
      });

      map.addSource('home-locations', {
        type: 'geojson',
        data: locationGeoJSON,
      });

      map.addLayer({
        id: 'home-location-circles',
        type: 'circle',
        source: 'home-locations',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            10,
            6
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#000',
            '#fff'
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2,
            1
          ]
        }
      });

      map.on('click', 'home-location-circles', (e) => {
        const feature = e.features[0];
        const parentId = feature.properties.parentId;

        if (selectedFeatureId && selectedFeatureId !== parentId) {
          map.setFeatureState({ source: 'submissions', id: selectedFeatureId }, { selected: false });
          map.setFeatureState({ source: 'home-locations', id: `loc-${selectedFeatureId}` }, { selected: false });
        }

        setSelectedFeatureId(parentId);
        map.setFeatureState({ source: 'submissions', id: parentId }, { selected: true });
        map.setFeatureState({ source: 'home-locations', id: `loc-${parentId}` }, { selected: true });

        const props = feature.properties || {};
        const formattedDate = props.created_at
          ? new Date(props.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
          : '—';

        const popupHTML = `
          <strong>${props.neighborhood || 'Unnamed'}</strong><br/>
          ${props.comments || 'No comments'}<br/>
          <small><strong>Submitted:</strong> ${formattedDate}</small><br/>
          <small><strong>Years:</strong> ${props.years || '—'}</small>
        `;

        new mapboxgl.Popup()
          .setLngLat(feature.geometry.coordinates)
          .setHTML(popupHTML)
          .addTo(map);
      });
    });
  }, [submissions, selectedFeatureId]);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
};

export default SubmissionsMap;