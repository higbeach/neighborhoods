// src/draw_open_polygon.js
// A debug-friendly custom mode for MapboxDraw that behaves like "open polygon"
// until the user clicks back on the starting point.

const DrawOpenPolygon = {
  onSetup() {
    console.log('🎬 onSetup fired');
    return {
      line: {
        type: 'Feature',
        properties: { id: String(Date.now()) },
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    };
  },

  clickAnywhere(state, e) {
    console.log('🖱 clickAnywhere fired at', e.lngLat);

    const coords = state.line.geometry.coordinates;

    // If user clicks near the first point, close polygon
    if (coords.length > 2) {
      const first = coords[0];
      const clicked = [e.lngLat.lng, e.lngLat.lat];
      const dx = first[0] - clicked[0];
      const dy = first[1] - clicked[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      console.log('🔍 distance to first point:', dist);

      if (dist < 0.0001) {
        console.log('✅ Closing polygon');
        const polygon = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[...coords, first]]
          }
        };
        this.map.fire('draw.create', { features: [polygon] });
        this.changeMode('simple_select', { featureIds: [] });
        return;
      }
    }

    // Otherwise add a new point
    coords.push([e.lngLat.lng, e.lngLat.lat]);
    console.log('➕ Added point, total coords:', coords.length);
    this.map.fire('draw.update', { features: [state.line] });
  },

  toDisplayFeatures(state, geojson, display) {
    // Always display the line being drawn
    if (state.line && geojson.geometry.type === 'LineString') {
      display(state.line);
    }
  },

  onStop(state) {
    console.log('🛑 onStop fired');
  }
};

export default DrawOpenPolygon;