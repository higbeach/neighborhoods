// src/draw_open_polygon.js
const DrawOpenPolygon = {
  onSetup(options = {}) {
    const line = this.newFeature({
      type: 'Feature',
      properties: { meta: 'feature' },
      geometry: { type: 'LineString', coordinates: [] }
    });
    this.addFeature(line);

    const ctx = {
      line,
      setBoundary: options.setBoundary || (() => {}),
      nearFirstVertex: false
    };

    // Handle UI events from Map.js (Undo and Reset)
    const undoHandler = () => {
      const coords = ctx.line.coordinates;

      if (coords.length === 0) return;

      // Remove the last vertex (use Feature API so IDs and state stay consistent)
      ctx.line.removeCoordinate(coords.length - 1);

      // If no points left, reset to a fresh empty line so user can draw again
      if (ctx.line.coordinates.length === 0) {
        this.deleteFeature(ctx.line.id);
        ctx.line = this.newFeature({
          type: 'Feature',
          properties: { meta: 'feature' },
          geometry: { type: 'LineString', coordinates: [] }
        });
        this.addFeature(ctx.line);
        ctx.nearFirstVertex = false;
      }

      // Notify Draw to re-render
      this.map.fire('draw.update', { features: [ctx.line.toGeoJSON()] });
    };

    const resetHandler = () => {
      // Full reset: delete feature and re-init an empty line
      if (ctx.line) this.deleteFeature(ctx.line.id);
      ctx.line = this.newFeature({
        type: 'Feature',
        properties: { meta: 'feature' },
        geometry: { type: 'LineString', coordinates: [] }
      });
      this.addFeature(ctx.line);
      ctx.nearFirstVertex = false;
    };

    this.map.on('ui:undo', undoHandler);
    this.map.on('ui:reset-draw', resetHandler);

    // Keep references for cleanup
    ctx._undoHandler = undoHandler;
    ctx._resetHandler = resetHandler;

    return ctx;
  },

  onClick(state, e) { return this._handleAddPoint(state, e); },
  onTap(state, e) { return this._handleAddPoint(state, e); },

  _handleAddPoint(state, e) {
    const coords = state.line.coordinates;
    const tolerance = 0.001;

    const first = coords[0];
    const dx = first?.[0] - e.lngLat.lng;
    const dy = first?.[1] - e.lngLat.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Close polygon by clicking near first vertex
    if (coords.length > 2 && dist < tolerance) {
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

    // Regular point addition (use Feature API)
    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    this.map.fire('draw.update', { features: [state.line.toGeoJSON()] });
  },

  onMouseMove(state, e) {
    if (state.line.coordinates.length > 0) {
      const first = state.line.coordinates[0];
      const dx = first[0] - e.lngLat.lng;
      const dy = first[1] - e.lngLat.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);

      state.nearFirstVertex = dist < 0.001;
      this.map.getCanvas().style.cursor = state.nearFirstVertex ? 'pointer' : 'default';
    }
  },

  toDisplayFeatures(state, geojson, display) {
    // No ghostlines. Only render the line and its vertices.
    if (geojson.geometry.type === 'LineString' && geojson.geometry.coordinates.length < 1) {
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
            first: isFirst ? 'true' : 'false',
            closing: isFirst && state.nearFirstVertex ? 'true' : 'false'
          },
          geometry: { type: 'Point', coordinates: coord }
        });
      });
    }
  },

  onStop() {
    // Cleanup event listeners
    if (this._ctx?._undoHandler) this.map.off('ui:undo', this._ctx._undoHandler);
    if (this._ctx?._resetHandler) this.map.off('ui:reset-draw', this._ctx._resetHandler);

    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;