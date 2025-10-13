import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import BoundariesForm from './BoundariesForm';
import neighborhoodNames from './neighborhoodNames';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const NeighborhoodMap = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(null);
  const [years, setYears] = useState(0);
  const [areaName, setAreaName] = useState('');
  const [boundary, setBoundary] = useState(null);

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.2868, 47.5609], // Columbia City
      zoom: 13,
    });

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });

    mapRef.current.addControl(drawRef.current);

    mapRef.current.on('draw.create', updateBoundary);
    mapRef.current.on('draw.update', updateBoundary);
    mapRef.current.on('draw.delete', () => setBoundary(null));

    mapRef.current.on('load', () => {
      const layerId = 'neighborhood-label';
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setLayoutProperty(layerId, 'visibility', 'none');
      }
    });
  }, []);

  useEffect(() => {
    if (step === 3 && drawRef.current) {
      drawRef.current.changeMode('draw_polygon');
    }
  }, [step]);

  const updateBoundary = () => {
    const data = drawRef.current.getAll();
    if (data.features.length > 0) {
      setBoundary(data.features[0]);
    } else {
      setBoundary(null);
    }
  };

  const handleConfirmLocation = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    setLocation(center);
    setStep(2);
  };

  const handleReset = () => {
    setLocation(null);
    setYears(0);
    setAreaName('');
    setBoundary(null);
    drawRef.current.deleteAll();
    setStep(0);
  };

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />

      {(step === 1 || step === 2 || step === 3) && (
        <div className="map-pin" />
      )}

      {step === 0 && (
        <div className="overlay overlay-intro">
          <h2>Help Us Map Your Neighborhood</h2>
          <p>This is a beta-test focused on Columbia City, Seattle and its adjacent neighborhoods.</p>
          <button onClick={() => setStep(1)}>Let's Go</button>
        </div>
      )}

      {step === 1 && (
        <div className="overlay overlay-enter">
          <h2>Step 1: Mark Where You Live!</h2>
          <p>Pan the map until the pin is centered over your home.</p>
          <button onClick={handleConfirmLocation}>I live here!</button>
        </div>
      )}

      {step === 2 && (
        <div className="overlay overlay-enter">
          <h2>Step 2: Years & Name</h2>

          <label>What do you call this area?</label>
          <input
            type="text"
            placeholder="Neighborhood name"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            list="neighborhood-names"
          />
          <datalist id="neighborhood-names">
            {neighborhoodNames.map((name, idx) => (
              <option key={idx} value={name} />
            ))}
          </datalist>

          <label>How long have you lived here?</label>
          <input
            type="range"
            min="0"
            max="100"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
          <p>{years} years</p>

          <div className="overlay-actions">
            <button onClick={() => setStep(3)} disabled={!areaName}>
              Next
            </button>
            <button className="secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="overlay overlay-enter">
          <h2>Step 3: Where would you mark this neighborhood's boundaries?</h2>
          <p>
            The polygon tool is active -- tap to add a starting point, tap again to add more points,
            doubleclick to close the shape.
          </p>
          <div className="overlay-actions">
            <button onClick={() => setStep(4)} disabled={!boundary}>
              Next
            </button>
            <button className="secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      )}

      {step === 4 && (() => {
        console.log('🧭 Rendering BoundariesForm with:', {
          boundary,
          location,
          years,
          areaName,
        });

        return (
          <BoundariesForm
            boundary={boundary}
            location={location}
            years={years}
            areaName={areaName}
            onReset={handleReset}
            onSubmitted={() => setStep(5)}
          />
        );
      })()}

      {step === 5 && (
        <div className="overlay overlay-enter">
          <h2>Thank you!</h2>
          <p>Your submission has been recorded.</p>
          <button onClick={handleReset}>Start Over</button>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodMap;