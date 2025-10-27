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

    if (!submissions.type || !Array.isArray(submissions.features)) {
      console.warn('⚠️ Submissions data is malformed:', submissions);
      return;
    }

    const map = mapRef.current;

    // 🎨 Assign dynamic colors per neighborhood
    const neighborhoodColors = {};
    const colorPalette = [
      '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
      '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', 
      '#008080', '#396139ff', '#9a6324', '#800000'
    ];
    let colorIndex = 0;

    submissions.features.forEach((f) => {
  // Ensure stable ID
  f.id = f.id || f.properties?.id || `feature-${Math.random().toString(36).substr(2, 9)}`;

  // Promote uuid from top-level to properties if missing
  if (!f.properties.uuid && f.uuid) {
    f.properties.uuid = f.uuid;
  }
});

    // 📍 Extract home location pins
    const locationFeatures = submissions.features
      .filter((f) =>
        f.properties.location &&
        typeof f.properties.location.lat === 'number' &&
        typeof f.properties.location.lng === 'number'
      )
      .map((f) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [f.properties.location.lng, f.properties.location.lat],
        },
        properties: {
          neighborhood: f.properties.neighborhood,
          comments: f.properties.comments,
          timestamp: f.properties.timestamp,
          years: f.properties.years,
          uuid: f.properties.uuid,
          parentId: f.id,
        },
        id: `loc-${f.id}`,
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
        if (!e.features.length) return;
        const feature = e.features[0];
        const id = feature.id;
        const props = feature.properties || {};

        if (selectedFeatureId !== null && selectedFeatureId !== id) {
          map.setFeatureState({ source: 'submissions', id: selectedFeatureId }, { selected: false });
          map.setFeatureState({ source: 'home-locations', id: `loc-${selectedFeatureId}` }, { selected: false });
        }

        if (id !== undefined && id !== null) {
          setSelectedFeatureId(id);
          map.setFeatureState({ source: 'submissions', id }, { selected: true });
          map.setFeatureState({ source: 'home-locations', id: `loc-${id}` }, { selected: true });
        }

        const popupHTML = `
          <strong>${props.neighborhood || 'Unnamed'}</strong><br/>
          ${props.comments || 'No comments'}<br/>
          <small>${props.timestamp || ''}</small><br/>
          <small><strong>Years:</strong> ${props.years || '—'}</small><br/>
          <small><strong>UUID:</strong> ${props.uuid || '—'}</small>
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
          'icon-size': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            1.8,
            1.2
          ],
          'icon-allow-overlap': true,
        },
      });

      map.on('click', 'home-location-pins', (e) => {
        if (!e.features.length) return;
        const feature = e.features[0];
        const parentId = feature.properties.parentId;

        if (selectedFeatureId !== null && selectedFeatureId !== parentId) {
          map.setFeatureState({ source: 'submissions', id: selectedFeatureId }, { selected: false });
          map.setFeatureState({ source: 'home-locations', id: `loc-${selectedFeatureId}` }, { selected: false });
        }

        setSelectedFeatureId(parentId);
        map.setFeatureState({ source: 'submissions', id: parentId }, { selected: true });
        map.setFeatureState({ source: 'home-locations', id: `loc-${parentId}` }, { selected: true });

        const props = feature.properties || {};
        const popupHTML = `
          <strong>${props.neighborhood || 'Unnamed'}</strong><br/>
          ${props.comments || 'No comments'}<br/>
          <small>${props.timestamp || ''}</small><br/>
          <small><strong>Years:</strong> ${props.years || '—'}</small><br/>
          <small><strong>UUID:</strong> ${props.uuid || '—'}</small>
        `;

        new mapboxgl.Popup()
          .setLngLat(feature.geometry.coordinates)
          .setHTML(popupHTML)
          .addTo(map);
      });
    }
  }, [submissions, mapLoaded, selectedFeatureId]);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
};

export default SubmissionsMap;