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

      // Fit to block extent
      try {
        const bounds = bbox(blocks);
        const sw = [bounds[0], bounds[1]];
        const ne = [bounds[2], bounds[3]];

        if (sw[1] < -90 || sw[1] > 90 || ne[1] < -90 || ne[1] > 90) {
          console.warn('⚠️ Invalid bounds:', bounds);
        } else {
          mapRef.current.fitBounds([sw, ne], { padding: 20 });
        }
      } catch (err) {
        console.error('❌ Failed to fit bounds:', err);
      }

      // 🎨 Dynamically generate colors for each dominant_neighborhood
      const neighborhoods = Array.from(
        new Set(blocks.features.map(f => f.properties.dominant_neighborhood).filter(Boolean))
      );

      const generateColor = (i) => {
        const palette = [
          '#e41a1c', '#377eb8', '#4daf4a', '#984ea3',
          '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'
        ];
        return palette[i % palette.length];
      };

      const neighborhoodColors = neighborhoods.reduce((acc, name, i) => {
        acc[name] = generateColor(i);
        return acc;
      }, {});

      const matchExpression = ['match', ['get', 'dominant_neighborhood']];
      neighborhoods.forEach(name => {
        matchExpression.push(name, neighborhoodColors[name]);
      });
      matchExpression.push('#cccccc'); // fallback

      mapRef.current.addLayer({
        id: 'blocks-fill',
        type: 'fill',
        source: 'blocks',
        paint: {
          'fill-color': matchExpression,
          'fill-opacity': 0.6,
        },
      });

      mapRef.current.addLayer({
        id: 'blocks-outline',
        type: 'line',
        source: 'blocks',
        paint: {
          'line-color': '#333',
          'line-width': 0.5,
        },
      });

      // Popups
      mapRef.current.on('click', 'blocks-fill', (e) => {
        const f = e.features[0];
        const p = f.properties || {};

        const voteCount = p.vote_count ?? 0;
        const lastUpdated = p.last_updated || '';
        const blockId = p.BLOCK_ID || '—';

        const neighborhoodDetails = Object.entries(p)
          .filter(([key, value]) => key.endsWith('_pct') && value > 0)
          .map(([key, pct]) => {
            const name = key.replace('_pct', '');
            const count = p[name] ?? 0;
            return `<li><strong>${name}</strong>: ${count} votes (${pct.toFixed(1)}%)</li>`;
          })
          .join('');

        const popupHTML = `
          <strong>Block</strong>: ${blockId}<br/>
          <strong>Votes</strong>: ${voteCount}<br/>
          ${neighborhoodDetails ? `<ul>${neighborhoodDetails}</ul>` : '<em>No neighborhood votes</em>'}
          <small>${lastUpdated}</small><br/>
          <small style="color:#999;">v2025.10.08</small>
        `;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupHTML)
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