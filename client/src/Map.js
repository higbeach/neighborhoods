import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import BoundariesForm from './BoundariesForm';
import NeighborhoodSurvey from './NeighborhoodSurvey';
import neighborhoodNames from './neighborhoodNames';

// 👉 import your custom mode
import DrawOpenPolygon from './draw_open_polygon';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';

const NeighborhoodMap = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const markerRef = useRef(null);

  const [step, setStep] = useState(0); // ✅ start at intro (Step 0)
  const [location, setLocation] = useState(null);
  const [years, setYears] = useState(0);
  const [areaName, setAreaName] = useState('');
  const [boundary, setBoundary] = useState(null);

  const [showSurveyPrompt, setShowSurveyPrompt] = useState(false);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [surveyComplete, setSurveyComplete] = useState(false);
  const [drawingStarted, setDrawingStarted] = useState(false);
  const [submissionUuid, setSubmissionUuid] = useState(null);
  const [comments, setComments] = useState('');

  // ✅ Scroll to top on step change
  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, [step]);

  // ✅ Boundary update logic
  const updateBoundary = useCallback(() => {
    const data = drawRef.current.getAll();
    if (data.features.length > 0) {
      const feature = data.features[0];
      setBoundary(feature);

      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates?.[0];
        if (coords && coords.length > 3) {
          const first = coords[0];
          const last = coords[coords.length - 1];
          const isClosed = first[0] === last[0] && first[1] === last[1];

          if (isClosed && step === '3B') {
            setDrawingStarted(false);
            setStep('3C');
          }
        }
      }
    } else {
      setBoundary(null);
    }
  }, [step]);

  // ✅ Map initialization
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.2868, 47.5609],
      zoom: 13,
    });

    // Add zoom controls in lower right, no compass
    mapRef.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'bottom-right'
    );

    // ✅ Register custom mode
    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      modes: {
        ...MapboxDraw.modes,
        draw_open_polygon: DrawOpenPolygon, // add custom mode
      },
     styles: [
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.1 },
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: { 'line-color': '#ff0000', 'line-width': 3 },
  },
  {
    id: 'gl-draw-line-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'meta', 'feature']],
    paint: { 'line-color': '#ff0000', 'line-width': 2 },
  },
  {
    id: 'gl-draw-vertex-active',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
    paint: { 'circle-radius': 4, 'circle-color': '#ff0000' },
  },
  {
    id: 'gl-draw-ghost-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'meta', 'ghost']],
    paint: { 'line-color': '#ff6666', 'line-dasharray': [0.2, 2], 'line-width': 2 },
  },
  {
    id: 'debug-lines',
    type: 'line',
    filter: ['==', '$type', 'LineString'],
    paint: { 'line-color': '#00ff00', 'line-width': 3 }
  },
  {
    id: 'debug-points',
    type: 'circle',
    filter: ['==', '$type', 'Point'],
    paint: { 'circle-radius': 6, 'circle-color': '#0000ff' }
  }

],

    });

    mapRef.current.addControl(drawRef.current);

    // Attach listeners
    mapRef.current.on('draw.create', updateBoundary);
    mapRef.current.on('draw.update', updateBoundary);
    mapRef.current.on('draw.delete', () => setBoundary(null));

    mapRef.current.on('load', () => {
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
      const labelLayer = 'place-label';
      if (mapRef.current.getLayer(labelLayer)) {
        mapRef.current.setFilter(labelLayer, [
          'all',
          ['!=', ['get', 'place_type'], 'neighborhood'],
          ['!=', ['get', 'place_type'], 'locality'],
        ]);
      }
    });

    // Cleanup listeners
    return () => {
      if (!mapRef.current) return;
      mapRef.current.off('draw.create', updateBoundary);
      mapRef.current.off('draw.update', updateBoundary);
    };
  }, [updateBoundary]);

  useEffect(() => {
    console.log('📍 Step changed to:', step);
  }, [step]);

  useEffect(() => {
    console.log('🧾 Survey form visibility:', showSurveyForm);
  }, [showSurveyForm]);

  useEffect(() => {
    console.log('🧭 Survey render check — step:', step);
    console.log('🧭 showSurveyForm:', showSurveyForm);
    console.log('🧭 surveyComplete:', surveyComplete);
  }, [step, showSurveyForm, surveyComplete]);

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

  const startOver = () => {
    handleReset();
    setStep(0); // ✅ restart whole flow at intro
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
            <button onClick={() => setStep('3A')} disabled={!areaName}>Next</button>
            <button className="secondary" onClick={handleReset}>Reset</button>
          </div>
        </div>
      )}

 {/* --- Step 3A: Drawing Instructions --- */}
{step === '3A' && (
  <div className="overlay overlay-enter">
    <h2>Where would you mark this neighborhood’s boundaries?</h2>
    <div className="drawing-animation">
      {/* You can drop in a looping GIF or SVG here */}
      <p className="animation-caption">
            Here's how to draw: <br /><br />
            1. Tap/click to add a starting point<br />
            2. Tap/click again to add more points<br />
            3. Tap/click your starting point to close the shape.<br /><br />
            <strong>Note:</strong> To be included, the entirety of a block needs to be within your neighborhood boundary.
          </p>
    </div>
    <div className="overlay-actions">
      <button
        onClick={() => {
          drawRef.current.deleteAll();
          drawRef.current.changeMode('draw_open_polygon');
          setDrawingStarted(true);
          setStep('3B');
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }}
      >
        I’m ready to draw
      </button>
    </div>
  </div>
)}

{/* --- Step 3B: Drawing Step --- */}
{step === '3B' && drawingStarted && (
  <div className="map-controls">
    <button
      onClick={() => {
        const data = drawRef.current.getAll();
        if (data.features.length > 0) {
          const feature = data.features[0];

          if (feature.geometry.type === 'LineString') {
            // Still drawing an open line
            feature.geometry.coordinates.pop();
          } else if (feature.geometry.type === 'Polygon') {
            // Already closed into a polygon
            feature.geometry.coordinates[0].pop();
          }

          drawRef.current.set({
            type: 'FeatureCollection',
            features: [feature],
          });
        }
      }}
    >
      Undo
    </button>

    <button className="secondary" onClick={() => setStep('3A')}>
      Show Instructions
    </button>
  </div>
)}

{/* --- Step 3C: Confirmation ("Looking Good!") --- */}
{step === '3C' && (
  <div className="overlay overlay-enter">
    <h2>Looking good!</h2>
    <p>If this looks right, press Next. To try again, press Start Over.</p>
    <div className="overlay-actions">
      <button onClick={() => setStep('3D')}>Next</button>
      <button
        className="secondary"
        onClick={() => {
          drawRef.current.deleteAll();
          setBoundary(null);
          setStep('3A');
        }}
      >
        Start Over
      </button>
    </div>
  </div>
)}

{/* --- Step 3D: Additional Comments --- */}
{step === '3D' && (
  <div className="overlay overlay-enter">
    <h2>Any additional comments?</h2>
    <textarea
      value={comments}
      onChange={(e) => setComments(e.target.value)}
      placeholder="Add your thoughts here..."
    />
    <div className="overlay-actions">
      <button
        onClick={() => {
          // Save boundary + comments
          setStep(4);
        }}
      >
        Submit
      </button>
    </div>
  </div>
)}

{/* --- Step 4: Boundaries Form --- */}
{step === 4 && (
  <BoundariesForm
    boundary={boundary}
    location={location}
    years={years}
    areaName={areaName}
    comments={comments}
    onStartOver={startOver}
    onSubmitted={(uuid) => {
      setSubmissionUuid(uuid);
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