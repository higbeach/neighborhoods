// src/draw_open_polygon.js
const DrawOpenPolygon = {
  onSetup() {
    return {
      line: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    };
  },

  clickAnywhere(state, e) {
    const coords = state.line.geometry.coordinates;

    // If first point clicked again, close polygon
    if (coords.length > 2) {
      const first = coords[0];
      const clicked = [e.lngLat.lng, e.lngLat.lat];
      const dx = first[0] - clicked[0];
      const dy = first[1] - clicked[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.0001) {
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
    state.line.geometry.coordinates.push([e.lngLat.lng, e.lngLat.lat]);
    this.map.fire('draw.update', { features: [state.line] });
  },

  toDisplayFeatures(state, geojson, display) {
    // Show the line while drawing
    if (geojson.geometry.type === 'LineString' && geojson === state.line) {
      display(geojson);
    }
  }
};

export default DrawOpenPolygon;