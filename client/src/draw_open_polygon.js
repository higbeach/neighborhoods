// draw_open_polygon.js
// Custom mode that manages its own vertex + line rendering via dedicated GeoJSON sources/layers.
// Fixes:
// - Lines erase instantly on undo (we control the line layer)
// - First vertex styled differently (larger, different color)
// - On close, we replace the working line with a Polygon so BoundariesForm sees a valid polygon

const VERTICES_SOURCE_ID = 'custom-vertices-source';
const VERTICES_LAYER_ID = 'custom-vertices-layer';
const LINE_SOURCE_ID = 'custom-line-source';
const LINE_LAYER_ID = 'custom-line-layer';

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

    // Ensure our custom sources/layers exist
    this._ensureCustomLayers();

    const state = {
      line,
      setBoundary: options.setBoundary || (() => {}),
      nearFirstVertex: false,
      _pendingSync: false,

      syncCustomSources: () => {
        const coords = state.line.coordinates;
        const parentId = state.line.id;

        // Vertices
        const vertexFeatures = coords.map((c, i) => pointFeature(c, parentId, i));
        const vertexData = featureCollection(vertexFeatures);
        try {
          const vSrc = this.map.getSource(VERTICES_SOURCE_ID);
          if (vSrc) vSrc.setData(vertexData);
          console.log(`⭕ [mode] vertices synced: count=${coords.length}`);
        } catch (err) {
          console.error('❌ [mode] syncVertices error:', err);
        }

        // Line
        const lineData = featureCollection(
          coords.length >= 2 ? [state.line.toGeoJSON()] : []
        );
        try {
          const lSrc = this.map.getSource(LINE_SOURCE_ID);
          if (lSrc) lSrc.setData(lineData);
          console.log(`📏 [mode] line synced: coords=${coords.length}`);
        } catch (err) {
          console.error('❌ [mode] syncLine error:', err);
        }
      },

      scheduleSync: () => {
        if (state._pendingSync) return;
        state._pendingSync = true;
        requestAnimationFrame(() => {
          try {
            state.syncCustomSources();
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

      // Sync both vertices and line instantly
      state.scheduleSync();
    };

    this.map.on('ui:undo', undoHandler);
    state._undoHandler = undoHandler;

    // Initial sync
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

      // Replace line with polygon so downstream sees a Polygon
      try { this.deleteFeature(state.line.id); } catch {}
      state.line = polygon;

      if (typeof state.setBoundary === 'function') {
        state.setBoundary(polyJSON); // ensures BoundariesForm sees a Polygon
      }

      // Clear custom sources now that polygon is finalized
      this._clearCustomSources();

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
      // We render the line ourselves via the custom source/layer
      console.log(`🔵 [mode] toDisplayFeatures (ignoring line) coords=${geojson.geometry.coordinates.length}`);
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
    this._clearCustomSources();
  },

  // Helpers for custom sources/layers
  _ensureCustomLayers() {
    const map = this.map;

    // Vertices source
    if (!map.getSource(VERTICES_SOURCE_ID)) {
      map.addSource(VERTICES_SOURCE_ID, {
        type: 'geojson',
        data: featureCollection()
      });
      console.log('🧱 [mode] Added vertices source');
    }

    // Regular vertices layer
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

    // First vertex layer (distinct style)
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

    // Line source
    if (!map.getSource(LINE_SOURCE_ID)) {
      map.addSource(LINE_SOURCE_ID, {
        type: 'geojson',
        data: featureCollection()
      });
      console.log('🧱 [mode] Added line source');
    }

    // Line layer (red dashed)
    if (!map.getLayer(LINE_LAYER_ID)) {
      map.addLayer({
        id: LINE_LAYER_ID,
        type: 'line',
        source: LINE_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ff0000', 'line-width': 2, 'line-dasharray': [2, 2] }
      });
      console.log('🎯 [mode] Added line layer');
    }
  },

  _clearCustomSources() {
    try {
      const vSrc = this.map.getSource(VERTICES_SOURCE_ID);
      if (vSrc) vSrc.setData(featureCollection());
      const lSrc = this.map.getSource(LINE_SOURCE_ID);
      if (lSrc) lSrc.setData(featureCollection());
      console.log('🧽 [mode] Cleared custom sources (vertices + line)');
    } catch (err) {
      console.warn('⚠️ [mode] clearCustomSources failed:', err);
    }
  }
};

export default DrawOpenPolygon;