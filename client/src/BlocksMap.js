import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const BlocksMap = ({ blocks }) => {
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
      mapRef.current.addSource('blocks', {
        type: 'geojson',
        data: blocks,
      });

      // Color ramp by vote_count
      mapRef.current.addLayer({
        id: 'blocks-fill',
        type: 'fill',
        source: 'blocks',
        paint: {
          'fill-color': [
            'step',
            ['get', 'vote_count'],
            '#f0f9e8',     // 0
            1, '#ccebc5',  // 1+
            3, '#a8ddb5',  // 3+
            5, '#7bccc4',  // 5+
            10, '#43a2ca', // 10+
            20, '#0868ac'  // 20+
          ],
          'fill-opacity': 0.6
        }
      });

      mapRef.current.addLayer({
        id: 'blocks-outline',
        type: 'line',
        source: 'blocks',
        paint: {
          'line-color': '#333',
          'line-width': 0.5
        }
      });

      // Popups
      mapRef.current.on('click', 'blocks-fill', (e) => {
        const f = e.features[0];
        const p = f.properties || {};
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <strong>Block</strong>: ${p.block_id || '—'}<br/>
            <strong>Votes</strong>: ${p.vote_count ?? 0}<br/>
            <strong>Neighborhoods</strong>: ${(p.neighborhoods || []).join(', ') || '—'}<br/>
            <small>${p.last_updated || ''}</small>
          `)
          .addTo(mapRef.current);
      });

      mapRef.current.on('mouseenter', 'blocks-fill', () => {
        mapRef.current.getCanvas().style.cursor = 'pointer';
      });
      mapRef.current.on('mouseleave', 'blocks-fill', () => {
        mapRef.current.getCanvas().style.cursor = '';
      });
    });
  }, [blocks]);

  return <div ref={mapContainer} style={{ width: '100vw', height: '100vh' }} />;
};

export default BlocksMap;