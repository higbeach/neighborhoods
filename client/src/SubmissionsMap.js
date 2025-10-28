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

    // 🧼 Filter out archived submissions
    const activeFeatures = submissions.features.filter(f => f.properties.archived !== true);

    const map = mapRef.current;

    // 🎨 Assign dynamic colors per neighborhood
    const neighborhoodColors = {};
    const colorPalette = [
      '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
      '#911eb4', '#46f0f0', '#f032e6', '#bcf60c',
      '#008080', '#396139', '#9a6324', '#800000'
    ];
    let colorIndex = 0;

    activeFeatures.forEach((f) => {
      f.id = f.id || f.properties?.id || `feature-${Math.random().toString(36).substr(2, 9)}`;
      f.properties.uuid = f.properties.uuid || f.uuid;
      f.properties.created_at = f.created_at; // ✅ promote timestamp
      f.properties.neighborhoodColor = neighborhoodColors[f.properties.neighborhood] || (() => {
        const name = f.properties.neighborhood || 'Unknown';
        if (!neighborhoodColors[name]) {
          neighborhoodColors[name] = colorPalette[colorIndex % colorPalette.length];
          colorIndex++;
        }
        return neighborhoodColors[name];
        
      })();

      console.log(`🧩 Feature ID: ${f.id}, Archived: ${f.properties.archived}, Created At: ${f.properties.created_at}`);
    });

      

    // 📍 Extract home location pins
    const locationFeatures = activeFeatures
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


       // 🟦 Add or update polygon boundaries
    if (map.getSource('submissions')) {
      map.getSource('submissions').setData({
        type: 'FeatureCollection',
        features: activeFeatures
      });
    } else {
      map.addSource('submissions', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: activeFeatures
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
        if (!e.features.length) return;
        const feature = e.features[0];
        const id = feature.id;
        console.log('🧠 Full clicked feature:', feature);
        const props = feature.properties || {};

        console.log('🔍 Clicked boundary feature ID:', id);

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
            <small><strong>Submitted:</strong> ${props.created_at || '—'}</small><br/>
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
        if (!e.features.length) return;
        const feature = e.features[0];
        const parentId = feature.properties.parentId;

        console.log('🔍 Clicked point feature parent ID:', parentId);

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
            <small><strong>Submitted:</strong> ${props.created_at || '—'}</small><br/>
            <small><strong>Years:</strong> ${props.years || '—'}</small>

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