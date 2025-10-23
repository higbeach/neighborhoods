// src/draw_open_polygon.js
const DrawOpenPolygon = {
  onSetup(options = {}) {
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
      setBoundary: options.setBoundary || (() => {})
    };
  },

  onClick(state, e) { return this._handleAddPoint(state, e); },
  onTap(state, e) { return this._handleAddPoint(state, e); },

  _handleAddPoint(state, e) {
    console.log('🖱 onClick/onTap fired at', e.lngLat);

    const coords = state.line.coordinates;
    const tolerance = 0.001;

    const first = coords[0];
    const dx = first?.[0] - e.lngLat.lng;
    const dy = first?.[1] - e.lngLat.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ✅ Close polygon by clicking near first vertex
    if (coords.length > 2 && dist < tolerance) {
      console.log('✅ Closing polygon via first-point click');

      const polygon = this.newFeature({
        type: 'Feature',
        properties: { meta: 'final' },
        geometry: { type: 'Polygon', coordinates: [[...coords, first]] }
      });

      this.addFeature(polygon);
      this.map.fire('draw.create', { features: [polygon.toGeoJSON()] });
      this.map.fire('draw.finish', { features: [polygon.toGeoJSON()] });

      if (typeof state.setBoundary === 'function') {
        state.setBoundary(polygon.toGeoJSON());
      }

      this.changeMode('simple_select', { featureIds: [] });
      return;
    }

    // Regular point addition
    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    console.log('➕ Added point, total coords:', state.line.coordinates.length);

    this.map.fire('draw.update', { features: [state.line.toGeoJSON()] });
  },

  toDisplayFeatures(state, geojson, display) {
    // Don’t emit anything if too few points
    if (geojson.geometry.type === 'LineString' &&
        geojson.geometry.coordinates.length < 1) {
      return;
    }

    display(geojson);

    if (geojson.geometry.type === 'LineString') {
      geojson.geometry.coordinates.forEach((coord, idx) => {
        const isFirst = idx === 0;
        display({
          id: `${geojson.id}.${idx}`,
          type: 'Feature',
          properties: {
            meta: 'vertex',
            parent: geojson.id,
            coord_path: idx,
            first: isFirst ? 'true' : 'false'
          },
          geometry: { type: 'Point', coordinates: coord }
        });
      });
    }
  },

  onStop() {
    console.log('🛑 onStop fired');
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;