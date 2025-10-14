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
  const markerRef = useRef(null);

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
      const layersToHide = [
        'neighborhood-label',
        'place-label',
        'place-city-lg-n',
        'place-city-lg-s',
        'place-city-md-n',
        'place-city-md-s',
        'place-city-sm'
      ];

      layersToHide.forEach((layerId) => {
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.setLayoutProperty(layerId, 'visibility', 'none');
        }
      });
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

    if (markerRef.current) {
      markerRef.current.remove();
    }

    markerRef.current = new mapboxgl.Marker({
      element: createCustomMarker(),
    })
      .setLngLat(center)
      .addTo(mapRef.current);
  };

  const createCustomMarker = () => {
    const img = document.createElement('img');
    img.src = '/pin-icon.svg';
    img.alt = 'Selected location';
    img.style.width = '32px';
    img.style.height = 'auto';
    return img;
  };

  const handleReset = () => {
    setLocation(null);
    setYears(0);
    setAreaName('');
    setBoundary(null);
    drawRef.current.deleteAll();
    setStep(0);

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />

      {step === 1 && (
        <div className="map-pin">
          <svg viewBox="0 0 16 16" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.37892 10.2236L8 16L12.6211 10.2236C13.5137 9.10788 14 7.72154 14 6.29266V6C14 2.68629 11.3137 0 8 0C4.68629 0 2 2.68629 2 6V6.29266C2 7.72154 2.4863 9.10788 3.37892 10.2236ZM8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z"
              fill="#ff0000"
            />
          </svg>
        </div>
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
          <h2>Mark Where You Live</h2>
          <p>Pan the map until the pin is centered over where you live.</p>
          <button onClick={handleConfirmLocation}>I live here!</button>
        </div>
      )}

      {step === 2 && (
        <div className="overlay overlay-enter">
          <h2>What do you call this area?</h2>

          <label>Type the neigbhood name</label>
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

          <label>How many years have you lived here?</label>
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
          <h2>Where would you mark this neighborhood's boundaries?</h2>
          <p>
            The polygon tool is active -- tap to add a starting point, tap again to add more points,
            double-click to close the shape.
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