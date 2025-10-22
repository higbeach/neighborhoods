// src/draw_open_polygon.js
// Debug-friendly custom mode for MapboxDraw

const DrawOpenPolygon = {
  onSetup() {
    console.log('🎬 onSetup fired');

    const line = {
      type: 'Feature',
      properties: { id: String(Date.now()) },
      geometry: { type: 'LineString', coordinates: [] }
    };

    // ✅ Register the feature with Draw’s internal store
    this.addFeature(line);

    return {
      line,
      cursor: 'default',
      currentMousePosition: null
    };
  },

  onClick(state, e) {
    console.log('🖱 onClick fired at', e.lngLat);

    const coords = state.line.geometry.coordinates;
    coords.push([e.lngLat.lng, e.lngLat.lat]);
    console.log('➕ Added point, total coords:', coords.length);

    this.map.fire('draw.update', { features: [state.line] });
  },

  onMouseMove(state, e) {
    state.currentMousePosition = [e.lngLat.lng, e.lngLat.lat];
  },

  toDisplayFeatures(state, geojson, display) {
    console.log('🎨 toDisplayFeatures called for', geojson);

    if (!state.line) return;

    // Always display the current line
    if (state.line.geometry.coordinates.length > 0) {
      const lineFeature = {
        type: 'Feature',
        properties: { meta: 'feature' },
        geometry: state.line.geometry
      };
      console.log('Displaying line:', lineFeature);
      display(lineFeature);

      // Vertices
      state.line.geometry.coordinates.forEach((coord, idx) => {
        const vertex = {
          type: 'Feature',
          properties: { meta: 'vertex', coord_path: idx },
          geometry: { type: 'Point', coordinates: coord }
        };
        console.log('Displaying vertex:', vertex);
        display(vertex);
      });

      // Ghost line
      if (state.currentMousePosition) {
        const last = state.line.geometry.coordinates[state.line.geometry.coordinates.length - 1];
        const ghost = {
          type: 'Feature',
          properties: { meta: 'ghost' },
          geometry: { type: 'LineString', coordinates: [last, state.currentMousePosition] }
        };
        console.log('Displaying ghost line:', ghost);
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