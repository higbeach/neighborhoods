import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import BoundariesForm from './BoundariesForm';
import NeighborhoodSurvey from './NeighborhoodSurvey';
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

  const [showSurveyPrompt, setShowSurveyPrompt] = useState(false); // ✅ NEW
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [surveyComplete, setSurveyComplete] = useState(false);
  const [drawingStarted, setDrawingStarted] = useState(false);
  const [submissionUuid, setSubmissionUuid] = useState(null);



  // ✅ Scroll to top on step change
useEffect(() => {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 100); // 100ms delay
}, [step]);


  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.2868, 47.5609],
      zoom: 13,
    });

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false, // disables all default controls
      controls: {}                   // explicitly no controls
    });

    mapRef.current.addControl(drawRef.current);

    mapRef.current.on('draw.create', updateBoundary);
    mapRef.current.on('draw.update', updateBoundary);
    mapRef.current.on('draw.delete', () => setBoundary(null));

    mapRef.current.on('load', () => {
      // Attempt to hide known label layers
      const layersToHide = [
        'neighborhood-label',
        'neighborhood_label',
        'place_label',
        'place-city-lg-n',
        'place-city-lg-s',
        'place-city-md-n',
        'place-city-md-s',
        'place-city-sm',
      ];

      layersToHide.forEach((layerId) => {
        if (mapRef.current.getLayer(layerId)) {
          mapRef.current.setLayoutProperty(layerId, 'visibility', 'none');
        }
      });

      // Filter out neighborhood and locality labels from 'place-label' layer
      const labelLayer = 'place-label';
      if (mapRef.current.getLayer(labelLayer)) {
        mapRef.current.setFilter(labelLayer, [
          'all',
          ['!=', ['get', 'place_type'], 'neighborhood'],
          ['!=', ['get', 'place_type'], 'locality'],
        ]);
      }
    });

  }, []);

 // useEffect(() => {
 //   if (step === 3 && drawRef.current) {
 //     drawRef.current.changeMode('draw_polygon');
 //   }
 // }, [step]);

  useEffect(() => {
    console.log('📍 Step changed to:', step);
  }, [step]);

  useEffect(() => {
    console.log('🧾 Survey form visibility:', showSurveyForm);
  }, [showSurveyForm]);

  const updateBoundary = () => {
    const data = drawRef.current.getAll();
    if (data.features.length > 0) {
      console.log('✅ Boundary created:', data.features[0]);
      setBoundary(data.features[0]);
    } else {
      console.log('⚠️ Boundary cleared or invalid');
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
    setShowSurveyPrompt(false);
    setShowSurveyForm(false);
    setSurveyComplete(false);

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  const validateAndFinishDrawing = () => {
    const drawn = drawRef.current?.getAll();
    const feature = drawn?.features?.[0];
    const geometry = feature?.geometry;

    if (!geometry || geometry.type !== 'Polygon') {
      alert('Please draw a polygon before finishing.');
      return;
    }

    const coords = geometry.coordinates?.[0];
    if (!coords || coords.length < 4) {
      alert('Please double-click/tap to close the boundary.');
      return;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];

    if (!isClosed) {
      alert('Please double-click/tap to close the boundary.');
      return;
    }

    setBoundary(feature);
    setStep(4);
  };

  const clearBoundary = () => {
  drawRef.current.deleteAll();
  setBoundary(null);
  drawRef.current.changeMode('draw_polygon'); // ✅ Re-enable drawing
  setStep(3); // stay on drawing step
};

const startOver = () => {
  handleReset(); // reuse your full reset logic
};
    return (
      <div className="map-wrapper">
        {/* Map container */}
        <div ref={mapContainer} className="map-container" />

        {step === 0 && (
          <div className="overlay overlay-enter">
            <h2>Help Us Map Our Neighborhood.</h2>
            <p>Please help us create a community-sourced boundary map of <strong>Columbia City and its adjacent neighborhoods.</strong></p>
            <p>This website is a beta-test for a larger project. All of your information will be kept confidential.</p>
            <p>Please use <a href="https://www.convenepllc.com/contact-us/" target="_blank" rel="noopener noreferrer">
                this contact form
              </a> for any questions or feedback.
            </p>
            <div className="overlay-actions">
              <button onClick={() => setStep(1)}>Let's Get Started</button>
            </div>
          </div>
      )}

      {step === 1 && (
         <>
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

          <div className="overlay overlay-enter">
            <h2>Mark Where You Live</h2>
            <p>1.Pan the map until the pin is centered over where you live.<br />
              2. Click the "I Live here!" button</p>
            <div className="overlay-actions">
              <button onClick={handleConfirmLocation}>I live here!</button>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <div className="overlay overlay-enter">
          <h2>What do you call this area?</h2>
          <label>Type the neighborhood name</label>
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
            <button onClick={() => setStep(3)} disabled={!areaName}>Next</button>
            <button className="secondary" onClick={handleReset}>Reset</button>
          </div>
        </div>
      )}

      {step === 3 && !drawingStarted && (
        <div className="overlay overlay-enter">
          <h2>Where would you mark this neighborhood’s boundaries?</h2>
          <p>
            Here's how to draw: <br /><br />
            1. Tap/click to add a starting point<br />
            2. Tap/click again to add more points<br />
            3. Double click/tap to close the shape.<br />
            4. Click the "Finish Drawing" button when you are done.<br /><br />
            <strong>Note:</strong> To be included, the entirety of a block needs to be within your neighborhood boundary.
          </p>
          <div className="overlay-actions">
            <button
              onClick={() => {
                drawRef.current.deleteAll();
                drawRef.current.changeMode('draw_polygon');
                setDrawingStarted(true); // ✅ flip the flag
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
              }}
            >
              Start Drawing
            </button>
          </div>
        </div>
      )}

      {step === 3 && drawingStarted && (
        <div className="map-controls">
          <button
            onClick={validateAndFinishDrawing}
            onTouchStart={(e) => {
              e.preventDefault(); // prevent double trigger on iOS
              validateAndFinishDrawing();
            }}
            disabled={!boundary}
          >
            Finish Drawing
          </button>
          <button
            className="secondary"
            onClick={clearBoundary}
          >
            Clear Drawing
          </button>
        </div>
      )}


      {step === 4 && (
        <BoundariesForm
          boundary={boundary}
          location={location}
          years={years}
          areaName={areaName}
          onStartOver={startOver}       // ✅ Full reset
            onSubmitted={(uuid) => {
            setSubmissionUuid(uuid); // ✅ store the UUID
            setStep(5);
            setShowSurveyPrompt(true);
          }}

        />
      )}

      {step === 5 && showSurveyPrompt && !showSurveyForm && (
        <div className="overlay overlay-enter">
          <h2>Thank you for your submission!</h2>
          <p>Do you have 2–3 minutes to answer some additional questions about your feelings toward your neighborhood?</p>
          <div className="overlay-actions">
            <button onClick={() => setShowSurveyForm(true)}>Yes — take me to the survey</button>
            <button className="secondary" onClick={handleReset}>No thanks</button>
          </div>
        </div>
      )}

        console.log('🧭 Survey render check — step:', step);
        console.log('🧭 showSurveyForm:', showSurveyForm);
        console.log('🧭 surveyComplete:', surveyComplete);

      {step === 5 && showSurveyForm && !surveyComplete && (
        <NeighborhoodSurvey
          location={location}
          years={years}
          areaName={areaName}
          boundary={boundary}
          submissionUuid={submissionUuid} // ✅ pass the UUID
          onComplete={() => {
            setSurveyComplete(true);
          }}
        />


      )}

      {step === 5 && surveyComplete && (
        <div className="overlay overlay-enter">
          <h2>Thank you!</h2>
          <p>Your survey responses have been recorded.</p>
          <p>Please share this with other people you know who live in Columbia City or surrounding neighborhoods.</p>
          <div className="overlay-actions">
            <button onClick={handleReset}>Start Over</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodMap;