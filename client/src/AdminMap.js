import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ✅ Your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const AdminMap = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [submissions, setSubmissions] = useState([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch submissions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/submissions');
        const data = await res.json();
        setSubmissions(data);
      } catch (err) {
        console.error('Error fetching submissions:', err);
      }
    };
    fetchData();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.33, 47.61],
      zoom: 11,
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;
  }, []);

  // Add submissions once map is loaded and data is ready
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || submissions.length === 0) return;

    const map = mapRef.current;

    const geojson = {
      type: 'FeatureCollection',
      features: submissions.map((s, idx) => ({
        ...s.boundary,
        id: idx,
        properties: {
          areaName: s.areaName || 'Unnamed',
          years: s.years || 0,
          changes: s.changes || 'No notes',
        },
      })),
    };

    if (!map.getSource('submissions')) {
      map.addSource('submissions', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'submissions-fill',
        type: 'fill',
        source: 'submissions',
        paint: {
          'fill-color': '#888',
          'fill-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'submissions-outline',
        type: 'line',
        source: 'submissions',
        paint: {
          'line-color': '#444',
          'line-width': 2,
        },
      });

      map.on('click', 'submissions-fill', (e) => {
        const feature = e.features[0];
        const { areaName, years, changes } = feature.properties;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>${areaName}</strong><br/>
            Years lived: ${years}<br/>
            Changes: ${changes}
          `)
          .addTo(map);
      });

      map.on('mouseenter', 'submissions-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'submissions-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    } else {
      map.getSource('submissions').setData(geojson);
    }
  }, [mapLoaded, submissions]);

  return <div ref={mapContainer} className="map-container" />;
};

export default AdminMap;