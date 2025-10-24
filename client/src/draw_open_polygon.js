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
            this.map.fire('draw.update', { features: [state.line.toGeoJSON()] });
          } catch (err) {
            console.error('❌ draw.update failed:', err);
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
        state.line = this.newFeature({
          type: 'Feature',
          properties: { meta: 'feature' },
          geometry: { type: 'LineString', coordinates: [] }
        });
        this.addFeature(state.line);
        state.nearFirstVertex = false;
        console.log('🧹 Reset line after full undo');
      }

      state._scheduleUpdate(); // forces vertex redraw so dots disappear one-by-one
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

    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    console.log('➕ Total coords:', state.line.coordinates.length);
    state._scheduleUpdate();
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
      const count = geojson.geometry.coordinates.length;
      if (count >= 2) display(geojson); // line only when 2+ points

      // Always render vertices; first vertex tagged consistently
      geojson.geometry.coordinates.forEach((coord, idx) => {
        display({
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
        });
      });
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