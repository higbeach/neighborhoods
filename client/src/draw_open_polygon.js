// draw_open_polygon.js

const DrawOpenPolygon = {
  onSetup(options = {}) {
    console.log('🎬 onSetup fired');

    const line = this.newFeature({
      type: 'Feature',
      properties: { meta: 'feature' },
      geometry: { type: 'LineString', coordinates: [] }
    });
    this.addFeature(line);

    const state = {
      line,
      setBoundary: options.setBoundary || (() => {}),
      nearFirstVertex: false,
      _pendingUpdate: false,
      _scheduleUpdate: () => {
        if (state._pendingUpdate) return;
        state._pendingUpdate = true;
        requestAnimationFrame(() => {
          try {
            const featureJSON = state.line.toGeoJSON();
            this.map.fire('draw.update', {
              action: 'change_coordinates',
              features: [featureJSON]
            });
            this.map.fire('draw.render');
            console.log('🎨 render/update fired — coords:', state.line.coordinates.length);
          } finally {
            state._pendingUpdate = false;
          }
        });
      }
    };

    const undoHandler = () => {
      const coords = state.line.coordinates;
      console.log('↩️ Undo — coords before:', coords.length);
      if (coords.length === 0) return;

      state.line.removeCoordinate(coords.length - 1);
      console.log('↩️ After undo — coords:', state.line.coordinates.length);

      if (state.line.coordinates.length === 0) {
        try { this.deleteFeature(state.line.id); } catch {}
        const fresh = this.newFeature({
          type: 'Feature',
          properties: { meta: 'feature' },
          geometry: { type: 'LineString', coordinates: [] }
        });
        this.addFeature(fresh);
        state.line = fresh;
        state.nearFirstVertex = false;
        console.log('🧹 Reset line after full undo');
      }

      state._scheduleUpdate(); // re-renders vertices one-by-one
    };

    this.map.on('ui:undo', undoHandler);
    state._undoHandler = undoHandler;
    return state;
  },

  onClick(state, e) { return this._handleAddPoint(state, e); },
  onTap(state, e) { return this._handleAddPoint(state, e); },

  _handleAddPoint(state, e) {
    const target = e?.originalEvent?.target;
    const canvas = this.map.getCanvas();
    if (target && !(target === canvas || canvas.contains(target))) return;

    console.log('🖱 Add point at', e.lngLat);

    const coords = state.line.coordinates;
    const first = coords[0];
    const dx = first?.[0] - e.lngLat.lng;
    const dy = first?.[1] - e.lngLat.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (coords.length > 2 && dist < 0.001) {
      console.log('✅ Closing polygon');
      const polygon = this.newFeature({
        type: 'Feature',
        properties: { meta: 'final' },
        geometry: { type: 'Polygon', coordinates: [[...coords, first]] }
      });
      this.addFeature(polygon);
      this.map.fire('draw.create', { features: [polygon.toGeoJSON()] });
      this.map.fire('draw.finish', { features: [polygon.toGeoJSON()] });
      if (typeof state.setBoundary === 'function') state.setBoundary(polygon.toGeoJSON());
      this.changeMode('simple_select', { featureIds: [] });
      return;
    }

    // Add coordinate and schedule a render/update
    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    console.log('➕ Total coords:', state.line.coordinates.length);
    state._scheduleUpdate(); // ensures first vertex appears immediately
  },

  onMouseMove(state, e) {
    if (state.line.coordinates.length > 0) {
      const first = state.line.coordinates[0];
      const dx = first[0] - e.lngLat.lng;
      const dy = first[1] - e.lngLat.lat;
      state.nearFirstVertex = Math.sqrt(dx * dx + dy * dy) < 0.001;
      this.map.getCanvas().style.cursor = state.nearFirstVertex ? 'pointer' : 'default';
    }
  },

  toDisplayFeatures(state, geojson, display) {
    if (geojson.geometry.type === 'LineString') {
      const coords = geojson.geometry.coordinates;
      const count = coords.length;

      // Draw the line only when 2+ points to avoid ghostlines
      if (count >= 2) display(geojson);

      // Always draw vertices — including the very first one
      coords.forEach((coord, idx) => {
        const vtx = {
          id: `${geojson.id}.${idx}`,
          type: 'Feature',
          properties: {
            meta: 'vertex',
            parent: geojson.id,
            coord_path: idx,
            first: idx === 0 ? 'true' : 'false',
            closing: idx === 0 && state.nearFirstVertex ? 'true' : 'false'
          },
          geometry: { type: 'Point', coordinates: coord }
        };
        display(vtx);
      });

      console.log('🔵 toDisplayFeatures — line coords:', count);
      return;
    }
    display(geojson);
  },

  onStop(state) {
    if (state?._undoHandler) this.map.off('ui:undo', state._undoHandler);
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;