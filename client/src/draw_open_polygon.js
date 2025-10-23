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
      currentMousePosition: null,
      nearFirstVertex: false,
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

    // ✅ Primary closure: user clicks near first vertex
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
        console.log('📦 Boundary updated in state (click closure)');
      }

      this.changeMode('simple_select', { featureIds: [] });
      return;
    }

    // ✅ Fallback closure: user double-clicks anywhere
    if (coords.length > 2 && e.originalEvent?.detail === 2) {
      console.log('✅ Closing polygon via double-click fallback');

      const polygon = this.newFeature({
        type: 'Feature',
        properties: { meta: 'final' },
        geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] }
      });

      this.addFeature(polygon);
      this.map.fire('draw.create', { features: [polygon.toGeoJSON()] });
      this.map.fire('draw.finish', { features: [polygon.toGeoJSON()] });

      if (typeof state.setBoundary === 'function') {
        state.setBoundary(polygon.toGeoJSON());
        console.log('📦 Boundary updated in state (double-click closure)');
      }

      this.changeMode('simple_select', { featureIds: [] });
      return;
    }

    // Regular point addition
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

      state.nearFirstVertex = dist < 0.001;
      this.map.getCanvas().style.cursor = state.nearFirstVertex ? 'pointer' : 'default';
    }
  },

  toDisplayFeatures(state, geojson, display) {
    display(geojson);

    if (geojson.geometry.type === 'LineString') {
      if (geojson.geometry.coordinates.length < 2) {
        return; // ✅ prevent stray dots/ghostlines after Undo
      }

      geojson.geometry.coordinates.forEach((coord, idx) => {
        const isFirst = idx === 0;
        display({
          id: `${geojson.id}.${idx}`,
          type: 'Feature',
          properties: {
            meta: 'vertex',
            parent: geojson.id,
            coord_path: idx,
            closing: isFirst && state.nearFirstVertex ? 'true' : 'false',
            pulse: isFirst ? 'true' : 'false'
          },
          geometry: { type: 'Point', coordinates: coord }
        });
      });
    }

    if (
      state.currentMousePosition &&
      geojson.geometry.type === 'LineString' &&
      geojson.geometry.coordinates.length > 0
    ) {
      const coords = geojson.geometry.coordinates;
      console.log('👻 Emitting ghostline:', {
        from: coords[coords.length - 1],
        to: state.currentMousePosition
      });

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
  },


  onStop() {
    console.log('🛑 onStop fired');
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;