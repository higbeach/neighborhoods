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

    const ctx = {
      line,
      setBoundary: options.setBoundary || (() => {}),
      nearFirstVertex: false
    };

    // Internal undo handler
    const undoHandler = () => {
      const coords = ctx.line.coordinates;
      console.log('↩️ ui:undo received. Before length:', coords.length);

      if (coords.length === 0) {
        console.log('↩️ Nothing to undo (already empty)');
        return;
      }

      ctx.line.removeCoordinate(coords.length - 1);
      console.log('↩️ After undo length:', ctx.line.coordinates.length);

      if (ctx.line.coordinates.length === 0) {
        // Reset to fresh empty line
        this.deleteFeature(ctx.line.id);
        ctx.line = this.newFeature({
          type: 'Feature',
          properties: { meta: 'feature' },
          geometry: { type: 'LineString', coordinates: [] }
        });
        this.addFeature(ctx.line);
        ctx.nearFirstVertex = false;
        console.log('🧹 Line reset to empty after full undo');
      }

      this.map.fire('draw.update', { features: [ctx.line.toGeoJSON()] });
    };

    this.map.on('ui:undo', undoHandler);

    ctx._undoHandler = undoHandler;
    this._ctx = ctx;
    return ctx;
  },

  onClick(state, e) { return this._handleAddPoint(state, e); },
  onTap(state, e) { return this._handleAddPoint(state, e); },

  _handleAddPoint(state, e) {
    // Guard: ignore clicks not on canvas
    const canvas = this.map.getCanvas();
    const target = e?.originalEvent?.target;
    if (target && target !== canvas) {
      console.log('🛡️ Ignored click from non-canvas target:', target.tagName || target.className);
      return;
    }

    console.log('🖱 onClick/onTap at', e.lngLat);

    const coords = state.line.coordinates;
    const tolerance = 0.001;

    const first = coords[0];
    const dx = first?.[0] - e.lngLat.lng;
    const dy = first?.[1] - e.lngLat.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Close polygon by clicking near first vertex
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
    console.log('➕ Added point, total coords now:', state.line.coordinates.length);

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
      console.log('🖱 MouseMove near first vertex?', state.nearFirstVertex);
    }
  },

  toDisplayFeatures(state, geojson, display) {
    if (geojson.geometry.type === 'LineString' &&
        geojson.geometry.coordinates.length < 1) {
      console.log('🚫 No coords to display');
      return;
    }

    display(geojson);

    if (geojson.geometry.type === 'LineString') {
      console.log('🔎 Rendering vertices, count:', geojson.geometry.coordinates.length);
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
        if (isFirst) {
          console.log('🌟 First vertex displayed at', coord);
        }
      });
    }
  },

  onStop() {
    console.log('🛑 onStop fired');
    if (this._ctx?._undoHandler) this.map.off('ui:undo', this._ctx._undoHandler);
    this.map.getCanvas().style.cursor = 'default';
    this._ctx = null;
  }
};

export default DrawOpenPolygon;