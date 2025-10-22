// src/draw_open_polygon.js
// Custom MapboxDraw mode: open polygon until user clicks back on the starting point

const DrawOpenPolygon = {
  onSetup() {
    console.log('🎬 onSetup fired');

    const line = this.newFeature({
      type: 'Feature',
      properties: { meta: 'feature' },
      geometry: { type: 'LineString', coordinates: [] }
    });

    this.addFeature(line);

    return {
      line,
      cursor: 'default',
      currentMousePosition: null
    };
  },

  onClick(state, e) {
    console.log('🖱 onClick fired at', e.lngLat);

    const coords = state.line.coordinates;

    // Expanded tolerance (~50m at Seattle latitude)
    const tolerance = 0.0005;

    // If user clicks near the first point, close polygon
    if (coords.length > 2) {
      const first = coords[0];
      const dx = first[0] - e.lngLat.lng;
      const dy = first[1] - e.lngLat.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < tolerance) {
        console.log('✅ Closing polygon');

        const polygon = this.newFeature({
          type: 'Feature',
          properties: { meta: 'final' },
          geometry: {
            type: 'Polygon',
            coordinates: [[...coords, first]]
          }
        });

        this.addFeature(polygon);

        // Fire events
        this.map.fire('draw.create', { features: [polygon.toGeoJSON()] });
        this.map.fire('draw.finish', { features: [polygon.toGeoJSON()] });

        // Exit drawing mode
        this.changeMode('simple_select', { featureIds: [] });
        return;
      }
    }

    // Otherwise add a new point
    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    console.log('➕ Added point, total coords:', state.line.coordinates.length);

    this.map.fire('draw.update', { features: [state.line.toGeoJSON()] });
  },

  onMouseMove(state, e) {
    state.currentMousePosition = [e.lngLat.lng, e.lngLat.lat];

    if (state.line.coordinates.length > 0) {
      const first = state.line.coordinates[0];
      const dx = first[0] - e.lngLat.lng;
      const dy = first[1] - e.lngLat.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.0005) {
        this.map.getCanvas().style.cursor = 'pointer';
      } else {
        this.map.getCanvas().style.cursor = 'default';
      }
    }
  },

  toDisplayFeatures(state, geojson, display) {
    // Always display the feature itself
    display(geojson);

    // Draw vertices as points with unique IDs
    if (geojson.geometry.type === 'LineString') {
      geojson.geometry.coordinates.forEach((coord, idx) => {
        display({
          id: `${geojson.id}.${idx}`,
          type: 'Feature',
          properties: { meta: 'vertex', parent: geojson.id, coord_path: idx },
          geometry: { type: 'Point', coordinates: coord }
        });
      });
    }

    // Draw ghost line if this is our active line
    if (
      state.currentMousePosition &&
      geojson.geometry.type === 'LineString' &&
      geojson.id === state.line.id
    ) {
      const coords = geojson.geometry.coordinates;
      if (coords.length > 0) {
        const ghost = {
          id: `${geojson.id}.ghost`,
          type: 'Feature',
          properties: { meta: 'ghost' },
          geometry: {
            type: 'LineString',
            coordinates: [coords[coords.length - 1], state.currentMousePosition]
          }
        };
        display(ghost);
      }
    }
  },

  onStop() {
    console.log('🛑 onStop fired');
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;