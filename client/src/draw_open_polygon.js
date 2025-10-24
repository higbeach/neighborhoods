const DrawOpenPolygon = {
  onSetup(options = {}) {
    console.log('🎬 onSetup fired');

    const line = this.newFeature({
      type: 'Feature',
      properties: { meta: 'feature' },
      geometry: { type: 'LineString', coordinates: [] }
    });
    this.addFeature(line);

    // Local mode state — DO NOT TOUCH this._ctx
    const ctx = {
      line,
      setBoundary: options.setBoundary || (() => {}),
      nearFirstVertex: false
    };

    const undoHandler = () => {
      const coords = ctx.line.coordinates;
      console.log('↩️ ui:undo received — coords before:', coords.length);

      if (coords.length === 0) {
        console.log('↩️ Nothing to undo (empty)');
        return;
      }

      ctx.line.removeCoordinate(coords.length - 1);
      console.log('↩️ After undo — coords:', ctx.line.coordinates.length);

      if (ctx.line.coordinates.length === 0) {
        // Delete the current feature safely via mode accessor
        try {
          this.deleteFeature(ctx.line.id);
          console.log('🧹 Deleted empty line feature:', ctx.line.id);
        } catch (err) {
          console.error('❌ deleteFeature failed:', err);
        }

        // Create a fresh empty feature for next points
        ctx.line = this.newFeature({
          type: 'Feature',
          properties: { meta: 'feature' },
          geometry: { type: 'LineString', coordinates: [] }
        });

        this.addFeature(ctx.line);
        ctx.nearFirstVertex = false;
        console.log('🧹 Line reset to empty after full undo — new id:', ctx.line.id);
      }

      // Fire a single update to refresh rendering
      try {
        this.map.fire('draw.update', { features: [ctx.line.toGeoJSON()] });
        console.log('🔄 draw.update fired after undo');
      } catch (err) {
        console.error('❌ draw.update fire failed:', err);
      }
    };

    this.map.on('ui:undo', undoHandler);

    // Track undo handler in state only — do not reassign this._ctx
    ctx._undoHandler = undoHandler;
    return ctx;
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

    // iPad-friendly target check
    if (target && !(target === canvas || canvas.contains(target))) {
      console.log('🛡️ Ignored tap outside map canvas');
      return;
    }

    console.log('🖱 onClick/onTap at', e.lngLat);

    const coords = state.line.coordinates;
    const tolerance = 0.001;

    const first = coords[0];
    const dx = first?.[0] - e.lngLat.lng;
    const dy = first?.[1] - e.lngLat.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Close polygon by tapping near the first vertex
    if (coords.length > 2 && dist < tolerance) {
      console.log('✅ Closing polygon via first-point click');

      const polygon = this.newFeature({
        type: 'Feature',
        properties: { meta: 'final' },
        geometry: { type: 'Polygon', coordinates: [[...coords, first]] }
      });

      try {
        this.addFeature(polygon);
        console.log('📦 Polygon added with id:', polygon.id);
      } catch (err) {
        console.error('❌ addFeature(polygon) failed:', err);
      }

      try {
        this.map.fire('draw.create', { features: [polygon.toGeoJSON()] });
        this.map.fire('draw.finish', { features: [polygon.toGeoJSON()] });
        console.log('🎯 draw.create and draw.finish fired');
      } catch (err) {
        console.error('❌ draw.create/draw.finish fire failed:', err);
      }

      if (typeof state.setBoundary === 'function') {
        state.setBoundary(polygon.toGeoJSON());
        console.log('📐 Boundary set via setBoundary in mode');
      }

      // Exit to simple_select cleanly
      try {
        this.changeMode('simple_select', { featureIds: [] });
        console.log('🚪 Changed mode to simple_select');
      } catch (err) {
        console.error('❌ changeMode(simple_select) failed:', err);
      }
      return;
    }

    // Add next point
    state.line.updateCoordinate(coords.length, e.lngLat.lng, e.lngLat.lat);
    console.log('➕ Added point, total coords:', state.line.coordinates.length);

    try {
      this.map.fire('draw.update', { features: [state.line.toGeoJSON()] });
      console.log('🔄 draw.update fired after add');
    } catch (err) {
      console.error('❌ draw.update fire failed:', err);
    }
  },

  onMouseMove(state, e) {
    if (state.line.coordinates.length > 0) {
      const first = state.line.coordinates[0];
      const dx = first[0] - e.lngLat.lng;
      const dy = first[1] - e.lngLat.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);

      state.nearFirstVertex = dist < 0.001;
      this.map.getCanvas().style.cursor = state.nearFirstVertex ? 'pointer' : 'default';
      console.log('🖱 MouseMove — near first?', state.nearFirstVertex);
    }
  },

  toDisplayFeatures(state, geojson, display) {
    // Suppress ghost rendering if fewer than 2 coords
    if (geojson.geometry.type === 'LineString' &&
        geojson.geometry.coordinates.length < 2) {
      console.log('🚫 Not enough coords to display');
      return;
    }

    // Display the line itself
    display(geojson);

    // Display vertices only for non-static LineStrings
    if (geojson.geometry.type === 'LineString') {
      const count = geojson.geometry.coordinates.length;
      console.log('🔎 Rendering vertices — count:', count);

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

  onStop(state) {
    console.log('🛑 onStop fired');
    if (state?._undoHandler) {
      this.map.off('ui:undo', state._undoHandler);
      console.log('🧼 Removed ui:undo listener');
    }
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;