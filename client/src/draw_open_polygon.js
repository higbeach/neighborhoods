// src/draw_open_polygon.js
//import { v4 as uuidv4 } from 'uuid';

const DrawOpenPolygon = {
  onSetup() {
    console.log('🎬 onSetup fired');

    const line = this.newFeature({
      type: 'Feature',
      properties: {},
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

    state.line.updateCoordinate(
      state.line.coordinates.length,
      e.lngLat.lng,
      e.lngLat.lat
    );

    console.log('➕ Added point, total coords:', state.line.coordinates.length);

    this.map.fire('draw.update', { features: [state.line.toGeoJSON()] });
  },

  onMouseMove(state, e) {
    state.currentMousePosition = [e.lngLat.lng, e.lngLat.lat];
  },

  toDisplayFeatures(state, geojson, display) {
    console.log('🎨 toDisplayFeatures called for', geojson);

    display(geojson);

    // Ghost line
    if (
      state.currentMousePosition &&
      geojson.geometry.type === 'LineString' &&
      geojson.properties.id === state.line.id
    ) {
      const coords = geojson.geometry.coordinates;
      if (coords.length > 0) {
        const ghost = {
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