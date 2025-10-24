// draw_open_polygon.js
// Custom mode that manages its own vertex rendering via a dedicated GeoJSON source/layer.
// Fixes:
// - Lines erase correctly on undo
// - First vertex styled differently (larger, different color)

const VERTICES_SOURCE_ID = 'custom-vertices-source';
const VERTICES_LAYER_ID = 'custom-vertices-layer';

function featureCollection(features = []) {
  return { type: 'FeatureCollection', features };
}

function pointFeature(coord, parentId, idx) {
  return {
    type: 'Feature',
    id: `${parentId}.${idx}`,
    properties: {
      meta: 'vertex',
      parent: parentId,
      coord_path: idx,
      first: idx === 0 ? 'true' : 'false'
    },
    geometry: { type: 'Point', coordinates: coord }
  };
}

const DrawOpenPolygon = {
  onSetup(options = {}) {
    console.log('🎬 [mode] onSetup fired');

    const line = this.newFeature({
      type: 'Feature',
      properties: { meta: 'feature' },
      geometry: { type: 'LineString', coordinates: [] }
    });
    this.addFeature(line);

    // Ensure our custom vertices source/layers exist
    this._ensureVerticesLayers();

    const state = {
      line,
      setBoundary: options.setBoundary || (() => {}),
      nearFirstVertex: false,
      _pendingSync: false,

      syncVertices: () => {
        const coords = state.line.coordinates;
        const parentId = state.line.id;
        const vertexFeatures = coords.map((c, i) => pointFeature(c, parentId, i));
        const data = featureCollection(vertexFeatures);

        try {
          const src = this.map.getSource(VERTICES_SOURCE_ID);
          if (src) {
            src.setData(data);
            console.log(`⭕ [mode] vertices synced: count=${coords.length}`);
          }
        } catch (err) {
          console.error('❌ [mode] syncVertices error:', err);
        }
      },

      scheduleSync: () => {
        if (state._pendingSync) return;
        state._pendingSync = true;
        requestAnimationFrame(() => {
          try {
            state.syncVertices();
            const featureJSON = state.line.toGeoJSON();
            this.map.fire('draw.update', {
              action: 'change_coordinates',
              features: [featureJSON]
            });
            this.map.fire('draw.render');
            console.log(
              `🎨 [mode] redraw fired — coords=${state.line.coordinates.length}`
            );
          } finally {
            state._pendingSync = false;
          }
        });
      }
    };

    const undoHandler = () => {
      const before = state.line.coordinates.length;
      console.log(`↩️ [mode] Undo clicked — coords before=${before}`);
      if (before === 0) return;

      state.line.removeCoordinate(before - 1);
      const after = state.line.coordinates.length;
      console.log(`↩️ [mode] After undo — coords=${after}`);

      if (after === 0) {
        try {
          this.deleteFeature(state.line.id);
          console.log('🧹 [mode] Deleted empty line feature');
        } catch (err) {
          console.warn('⚠️ [mode] delete empty line failed:', err);
        }
        const fresh = this.newFeature({
          type: 'Feature',
          properties: { meta: 'feature' },
          geometry: { type: 'LineString', coordinates: [] }
        });
        this.addFeature(fresh);
        state.line = fresh;
        state.nearFirstVertex = false;
        console.log('🧼 [mode] Reset line feature after full undo');
      }

      // Sync vertices and force line redraw
      state.scheduleSync();
    };

    this.map.on('ui:undo', undoHandler);
    state._undoHandler = undoHandler;

    state.scheduleSync();
    return state;
  },

  onClick(state, e) { return this._handleAddPoint(state, e); },
  onTap(state, e) { return this._handleAddPoint(state, e); },

  _handleAddPoint(state, e) {
    const target = e?.originalEvent?.target;
    const canvas = this.map.getCanvas();
    if (target && !(target === canvas || canvas.contains(target))) {
      console.log('🚫 [mode] Ignored click outside canvas');
      return;
    }

    console.log('🖱 [mode] Add point at', e.lngLat);

    const coords = state.line.coordinates;
    const first = coords[0];
    const dx = first?.[0] - e.lngLat.lng;
    const dy = first?.[1] - e.lngLat.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (coords.length > 2 && dist < 0.001) {
      console.log('✅ [mode] Closing polygon');

      const polygon = this.newFeature({
        type: 'Feature',
        properties: { meta: 'final' },
        geometry: { type: 'Polygon', coordinates: [[...coords, first]] }
      });
      this.addFeature(polygon);

      const polyJSON = polygon.toGeoJSON();
      this.map.fire('draw.create', { features: [polyJSON] });
      this.map.fire('draw.finish', { features: [polyJSON] });

      this._clearVertices();

      if (typeof state.setBoundary === 'function') {
        state.setBoundary(polyJSON);
      }

      this.changeMode('simple_select', { featureIds: [] });
      return;
    }

    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    console.log(`➕ [mode] Total coords after add=${state.line.coordinates.length}`);

    state.scheduleSync();
  },

  onMouseMove(state, e) {
    const n = state.line.coordinates.length;
    if (n > 0) {
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
      if (count >= 2) display(geojson);
      console.log(`🔵 [mode] toDisplayFeatures — line coords=${count}`);
      return;
    }
    display(geojson);
  },

  onStop(state) {
    if (state?._undoHandler) {
      this.map.off('ui:undo', state._undoHandler);
      console.log('🛑 [mode] Removed undo handler');
    }
    this.map.getCanvas().style.cursor = 'default';
    this._clearVertices();
  },

  // Helpers for vertices source/layers
  _ensureVerticesLayers() {
    const map = this.map;
    if (!map.getSource(VERTICES_SOURCE_ID)) {
      map.addSource(VERTICES_SOURCE_ID, {
        type: 'geojson',
        data: featureCollection()
      });
      console.log('🧱 [mode] Added vertices source');
    }

    if (!map.getLayer(VERTICES_LAYER_ID)) {
      map.addLayer({
        id: VERTICES_LAYER_ID,
        type: 'circle',
        source: VERTICES_SOURCE_ID,
        filter: ['all', ['==', 'meta', 'vertex'], ['!=', 'first', 'true']],
        paint: {
          'circle-radius': 5,
          'circle-color': '#ff0000',
          'circle-opacity': 1
        }
      });
      console.log('🎯 [mode] Added vertices layer (regular)');
    }

    if (!map.getLayer(VERTICES_LAYER_ID + '-first')) {
      map.addLayer({
        id: VERTICES_LAYER_ID + '-first',
        type: 'circle',
        source: VERTICES_SOURCE_ID,
        filter: ['all', ['==', 'meta', 'vertex'], ['==', 'first', 'true']],
        paint: {
          'circle-radius': 8,
          'circle-color': '#0000ff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });
      console.log('🎯 [mode] Added vertices layer (first point)');
    }
  },

  _clearVertices() {
    try {
      const src = this.map.getSource(VERTICES_SOURCE_ID);
      if (src) {
        src.setData(featureCollection());
        console.log('🧽 [mode] Cleared vertices source');
      }
    } catch (err) {
      console.warn('⚠️ [mode] clearVertices failed:', err);
    }
  }
};

export default DrawOpenPolygon;