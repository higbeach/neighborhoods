// src/draw_open_polygon.js
import DrawLineString from '@mapbox/mapbox-gl-draw/src/modes/draw_line_string';
import { geojsonTypes } from '@mapbox/mapbox-gl-draw/src/constants';

const DrawOpenPolygon = { ...DrawLineString };

// Override clickAnywhere to detect closure
DrawOpenPolygon.clickAnywhere = function (state, e) {
  const coords = state.line.coordinates;

  // If user clicks near the first point, close the polygon
  if (coords.length > 2) {
    const first = coords[0];
    const clicked = [e.lngLat.lng, e.lngLat.lat];
    const dx = first[0] - clicked[0];
    const dy = first[1] - clicked[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.0001) {
      // Close polygon
      const polygon = {
        type: geojsonTypes.FEATURE,
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[...coords, first]], // close ring
        },
      };

      this.map.fire('draw.create', {
        features: [polygon],
      });

      this.changeMode('simple_select', { featureIds: [] });
      return;
    }
  }

  // Otherwise, behave like line_string
  DrawLineString.clickAnywhere.call(this, state, e);
};

export default DrawOpenPolygon;