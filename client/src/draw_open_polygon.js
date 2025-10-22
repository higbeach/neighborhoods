// src/draw_open_polygon.js
const DrawOpenPolygon = {
  onSetup() {
    console.log('🎬 onSetup fired');
    return {
      line: {
        type: 'Feature',
        properties: { id: String(Date.now()) },
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      },
      cursor: 'default'
    };
  },

  onClick(state, e) {
    console.log('🖱 onClick fired at', e.lngLat);

    const coords = state.line.geometry.coordinates;

    // If user clicks near the first point, close polygon
    if (coords.length > 2) {
      const first = coords[0];
      const clicked = [e.lngLat.lng, e.lngLat.lat];
      const dx = first[0] - clicked[0];
      const dy = first[1] - clicked[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      console.log('🔍 distance to first point:', dist);

      // ✅ Increased tolerance for easier closing (about ~10m at lat ~47°)
      if (dist < 0.00015) {
        console.log('✅ Closing polygon');
        const polygon = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[...coords, first]]
          }
        };
        this.map.fire('draw.create', { features: [polygon] });
        this.changeMode('simple_select', { featureIds: [] });
        return;
      }
    }

    // Otherwise add a new point
    coords.push([e.lngLat.lng, e.lngLat.lat]);
    console.log('➕ Added point, total coords:', coords.length);
    this.map.fire('draw.update', { features: [state.line] });
  },

  onMouseMove(state, e) {
    const coords = state.line.geometry.coordinates;
    if (coords.length > 0) {
      const first = coords[0];
      const dx = first[0] - e.lngLat.lng;
      const dy = first[1] - e.lngLat.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // ✅ Change cursor when hovering near starting point
      if (dist < 0.00015) {
        if (state.cursor !== 'pointer') {
          this.map.getCanvas().style.cursor = 'pointer';
          state.cursor = 'pointer';
        }
      } else {
        if (state.cursor !== 'default') {
          this.map.getCanvas().style.cursor = 'default';
          state.cursor = 'default';
        }
      }
    }
  },

  toDisplayFeatures(state, geojson, display) {
    if (state.line) {
      display(state.line);

      // Also display each vertex as a Point feature
      state.line.geometry.coordinates.forEach((coord, idx) => {
        display({
          type: 'Feature',
          properties: {
            meta: 'vertex',
            parent: state.line.properties.id,
            coord_path: idx
          },
          geometry: {
            type: 'Point',
            coordinates: coord
          }
        });
      });
    }
  },

  onStop(state) {
    console.log('🛑 onStop fired');
    // Reset cursor when mode ends
    this.map.getCanvas().style.cursor = 'default';
  }
};

export default DrawOpenPolygon;