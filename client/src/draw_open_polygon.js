// src/draw_open_polygon.js
const DrawOpenPolygon = {
  onSetup() {
    console.log('🎬 onSetup fired');

    const line = this.newFeature({
      type: 'Feature',
      properties: { meta: 'feature' },
      geometry: { type: 'LineString', coordinates: [] }
    });

    this.addFeature(line);

    return { line, cursor: 'default', currentMousePosition: null };
  },

  onClick(state, e) { return this._handleAddPoint(state, e); },
  onTap(state, e) { return this._handleAddPoint(state, e); },

  _handleAddPoint(state, e) {
    console.log('🖱 onClick/onTap fired at', e.lngLat);

    const coords = state.line.coordinates;
    const tolerance = 0.001; // ~100m for touch

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
          geometry: { type: 'Polygon', coordinates: [[...coords, first]] }
        });

        this.addFeature(polygon);

        this.map.fire('draw.create', { features: [polygon.toGeoJSON()] });
        this.map.fire('draw.finish', { features: [polygon.toGeoJSON()] });

        this.changeMode('simple_select', { featureIds: [] });
        return;
      }
    }

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

      this.map.getCanvas().style.cursor = dist < 0.001 ? 'pointer' : 'default';
    }
  },

  toDisplayFeatures(state, geojson, display) {
  display(geojson);

  // Vertices (only for our active line)
  if (geojson.geometry.type === 'LineString' && geojson.id === state.line.id) {
    geojson.geometry.coordinates.forEach((coord, idx) => {
      const isFirst = idx === 0;
      display({
        id: `${geojson.id}.${idx}`,
        type: 'Feature',
        properties: {
          meta: 'vertex',
          parent: geojson.id,
          coord_path: idx,
          // First vertex gets closing:true when near
          closing: isFirst && state.nearFirstVertex ? 'true' : 'false'
        },
        geometry: { type: 'Point', coordinates: coord }
      });
    });
  }

  // Ghost line (last vertex → cursor)
  if (
    state.currentMousePosition &&
    geojson.geometry.type === 'LineString' &&
    geojson.id === state.line.id
  ) {
    const coords = geojson.geometry.coordinates;
    if (coords.length > 0) {
      display({
        id: `${geojson.id}.ghost`,
        type: 'Feature',
        properties: { meta: 'ghost' },
        geometry: {
          type: 'LineString',
          coordinates: [coords[coords.length - 1], state.currentMousePosition]
        }
      });
    }
  }
},

  onStop() {
    console.log('🛑 onStop fired');
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;