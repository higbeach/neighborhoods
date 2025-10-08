import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import bbox from '@turf/bbox';
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
      if (!blocks || !blocks.features?.length) {
        console.warn('⚠️ No blocks data available');
        return;
      }

      mapRef.current.addSource('blocks', {
        type: 'geojson',
        data: blocks,
      });

      // Validate and zoom to block extent
      try {
        const bounds = bbox(blocks); // [minX, minY, maxX, maxY]
        const sw = [bounds[0], bounds[1]];
        const ne = [bounds[2], bounds[3]];

        if (
          sw[1] < -90 || sw[1] > 90 ||
          ne[1] < -90 || ne[1] > 90
        ) {
          console.warn('⚠️ Invalid bounds:', bounds);
        } else {
          mapRef.current.fitBounds([sw, ne], { padding: 20 });
        }
      } catch (err) {
        console.error('❌ Failed to fit bounds:', err);
      }

      // Color ramp by votes
      mapRef.current.addLayer({
        id: 'blocks-fill',
        type: 'fill',
        source: 'blocks',
        paint: {
          'fill-color': [
            'step',
            ['get', 'votes'],
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
            <strong>Votes</strong>: ${p.votes ?? 0}<br/>
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