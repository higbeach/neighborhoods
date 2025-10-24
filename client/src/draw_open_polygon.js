// draw_open_polygon.js
// Complete custom mode with explicit, high-signal logging.
// Goals:
// - First vertex stays visible immediately.
// - Undo removes the last vertex dot (and line) instantly.
// - Undo is fast (throttled redraw via requestAnimationFrame).
// - No internal/private Draw calls; only public Mapbox GL events are fired.

const DrawOpenPolygon = {
  onSetup(options = {}) {
    console.log('🎬 [mode] onSetup fired');

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

      // throttle render/update to a single RAF tick
      _pendingUpdate: false,
      _scheduleUpdate: () => {
        if (state._pendingUpdate) return;
        state._pendingUpdate = true;

        requestAnimationFrame(() => {
          try {
            const coords = state.line.coordinates;
            const featureJSON = state.line.toGeoJSON();

            // Fire a lightweight update + render. These are public events.
            this.map.fire('draw.update', {
              action: 'change_coordinates',
              features: [featureJSON]
            });
            this.map.fire('draw.render');

            console.log(
              `🎨 [mode] render/update fired — coords=${coords.length} — ids: ${featureJSON.id}`
            );
          } catch (err) {
            console.error('❌ [mode] scheduleUpdate error:', err);
          } finally {
            state._pendingUpdate = false;
          }
        });
      }
    };

    const undoHandler = () => {
      const before = state.line.coordinates.length;
      console.log(`↩️ [mode] Undo clicked — coords before=${before}`);

      if (before === 0) {
        console.log('↩️ [mode] Undo ignored — no coordinates');
        return;
      }

      // Remove last vertex
      state.line.removeCoordinate(before - 1);

      const after = state.line.coordinates.length;
      console.log(`↩️ [mode] After undo — coords=${after}`);

      // If all points removed, reset the feature so no ghost vertices remain
      if (after === 0) {
        try {
          this.deleteFeature(state.line.id);
          console.log('🧹 [mode] Deleted empty line feature');
        } catch (err) {
          console.warn('⚠️ [mode] Delete empty line failed:', err);
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

      // Trigger a redraw so vertex dots update immediately
      state._scheduleUpdate();
    };

    this.map.on('ui:undo', undoHandler);
    state._undoHandler = undoHandler;

    return state;
  },

  onClick(state, e) {
    return this._handleAddPoint(state, e);
  },

  onTap(state, e) {
    return this._handleAddPoint(state, e);
  },

  _handleAddPoint(state, e) {
    const target = e?.originalEvent?.target;
    const canvas = this.map.getCanvas();
    // Only accept clicks on the canvas area
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

    // Closing condition: click near the first vertex when 3+ points exist
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

      if (typeof state.setBoundary === 'function') {
        try {
          state.setBoundary(polyJSON);
          console.log('📐 [mode] Boundary set on finish');
        } catch (err) {
          console.warn('⚠️ [mode] setBoundary failed:', err);
        }
      }

      this.changeMode('simple_select', { featureIds: [] });
      return;
    }

    // Add a new vertex
    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    const newLen = state.line.coordinates.length;
    console.log(`➕ [mode] Total coords after add=${newLen}`);

    // Schedule redraw to show vertex immediately (including first)
    state._scheduleUpdate();
  },

  onMouseMove(state, e) {
    const n = state.line.coordinates.length;
    if (n > 0) {
      const first = state.line.coordinates[0];
      const dx = first[0] - e.lngLat.lng;
      const dy = first[1] - e.lngLat.lat;
      state.nearFirstVertex = Math.sqrt(dx * dx + dy * dy) < 0.001;

      this.map.getCanvas().style.cursor = state.nearFirstVertex ? 'pointer' : 'default';
      // High-signal log at lower frequency: only when nearFirstVertex toggles would be ideal,
      // but for simplicity we keep it light.
    }
  },

  toDisplayFeatures(state, geojson, display) {
    if (geojson.geometry.type === 'LineString') {
      const coords = geojson.geometry.coordinates;
      const count = coords.length;

      // Draw the line only if 2+ points (prevents ghostlines)
      if (count >= 2) {
        display(geojson);
      }

      // Always emit vertex features — including the very first one
      coords.forEach((coord, idx) => {
        const vtx = {
          id: `${geojson.id}.${idx}`, // unique per coordinate
          type: 'Feature',
          properties: {
            meta: 'vertex',      // matches our circle layer filter
            parent: geojson.id,
            coord_path: idx,
            first: idx === 0 ? 'true' : 'false',
            closing: idx === 0 && state.nearFirstVertex ? 'true' : 'false'
          },
          geometry: { type: 'Point', coordinates: coord }
        };
        display(vtx);
      });

      console.log(`🔵 [mode] toDisplayFeatures — line coords=${count}`);
      return;
    }

    // Default passthrough for non-LineString features
    display(geojson);
  },

  onStop(state) {
    if (state?._undoHandler) {
      this.map.off('ui:undo', state._undoHandler);
      console.log('🛑 [mode] Removed undo handler');
    }
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;