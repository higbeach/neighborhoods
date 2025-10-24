import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import BoundariesForm from './BoundariesForm';
import NeighborhoodSurvey from './NeighborhoodSurvey';
import neighborhoodNames from './neighborhoodNames';
import DrawOpenPolygon from './draw_open_polygon';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWhpZ2JlZSIsImEiOiJjbWczeTQ3YXQwcDR5MmxxYjNvY2h0Mzd6In0.2KW_zGxkTEaJXPRFbOUqBw';
if (typeof mapboxgl.setTelemetryEnabled === 'function') {
  mapboxgl.setTelemetryEnabled(false);
}

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
  const [showSurveyPrompt, setShowSurveyPrompt] = useState(false);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [surveyComplete, setSurveyComplete] = useState(false);
  const [drawingStarted, setDrawingStarted] = useState(false);
  const [submissionUuid, setSubmissionUuid] = useState(null);

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
    setStep(0);
  };

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, [step]);

  const updateBoundary = useCallback(() => {
    const data = drawRef.current.getAll();
    if (data.features.length > 0) {
      const feature = data.features[0];
      setBoundary(feature);
    } else {
      setBoundary(null);
    }
  }, []);


// second quarter

   useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-122.2868, 47.5609],
      zoom: 13,
    });

    console.log('🗺️ Map initialized');

    mapRef.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'bottom-right'
    );

    mapRef.current.on('load', () => {
      console.log('🧩 Map loaded — hiding labels');

      // ✅ Remove any lingering draw layers
      const layerIdsToRemove = [
        'gl-draw-first-vertex',
        'gl-draw-vertex-closing',
        'gl-draw-vertex-active',
        'gl-draw-vertex-halo',
        'gl-draw-line-active',
        'gl-draw-polygon-fill',
        'gl-draw-polygon-stroke-active'
      ];
      layerIdsToRemove.forEach(id => {
        if (mapRef.current.getLayer(id)) {
          mapRef.current.removeLayer(id);
        }
      });

      // ✅ Remove draw sources if present
      const sourceIdsToRemove = ['mapbox-gl-draw-cold', 'mapbox-gl-draw-hot'];
      sourceIdsToRemove.forEach(id => {
        if (mapRef.current.getSource(id)) {
          mapRef.current.removeSource(id);
        }
      });

      // ✅ Add draw control only once
      if (!drawRef.current) {
        drawRef.current = new MapboxDraw({
          displayControlsDefault: false,
          controls: {},
          modes: {
            ...MapboxDraw.modes,
            draw_open_polygon: DrawOpenPolygon,
          },
          styles: [
            {
              id: 'gl-draw-polygon-fill',
              type: 'fill',
              source: 'mapbox-gl-draw-cold',
              filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
              paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.1 },
            },
            {
              id: 'gl-draw-polygon-stroke-active',
              type: 'line',
              source: 'mapbox-gl-draw-cold',
              filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
              paint: { 'line-color': '#ff0000', 'line-width': 3 },
            },
            {
              id: 'gl-draw-line-active',
              type: 'line',
              source: 'mapbox-gl-draw-cold',
              filter: ['all', ['==', '$type', 'LineString'], ['==', 'meta', 'feature']],
              paint: { 'line-color': '#ff0000', 'line-width': 2, 'line-dasharray': [2, 2] }
            },
            {
              id: 'gl-draw-vertex-halo',
              type: 'circle',
              source: 'mapbox-gl-draw-cold',
              filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
              paint: { 'circle-radius': 8, 'circle-color': '#ffffff' }
            },
            {
              id: 'gl-draw-vertex-active',
              type: 'circle',
              source: 'mapbox-gl-draw-cold',
              filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']],
              paint: { 'circle-radius': 5, 'circle-color': '#ff0000' }
            },
            {
              id: 'gl-draw-vertex-closing',
              type: 'circle',
              source: 'mapbox-gl-draw-cold',
              filter: ['all', ['==', '$type', 'Point'], ['==', 'closing', 'true']],
              paint: {
                'circle-radius': 7,
                'circle-color': '#00ff00',
                'circle-stroke-color': '#000000',
                'circle-stroke-width': 2
              }
            },
            {
              id: 'gl-draw-first-vertex',
              type: 'circle',
              source: 'mapbox-gl-draw-cold',
              filter: ['all',
                ['==', '$type', 'Point'],
                ['==', 'meta', 'vertex'],
                ['==', 'first', 'true']
              ],
              paint: {
                'circle-radius': 7,
                'circle-color': '#00cc00',
                'circle-stroke-color': '#000000',
                'circle-stroke-width': 2
              }
            }
          ]
        });

        mapRef.current.addControl(drawRef.current);
        console.log('✏️ Draw control added');

        mapRef.current.on('draw.create', updateBoundary);
        mapRef.current.on('draw.update', updateBoundary);
        mapRef.current.on('draw.delete', () => setBoundary(null));
        mapRef.current.on('draw.finish', (e) => {
          console.log('🎯 Custom finish event fired', e.features);
          updateBoundary();
          setDrawingStarted(false);
          setStep('3C');
        });
      }

      // ✅ Hide map labels
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

      const allLayers = mapRef.current.getStyle().layers;
      console.log('🧪 Final layer list:', allLayers.map(l => l.id));
    });

    return () => {
      if (!mapRef.current) return;
      mapRef.current.off('draw.create', updateBoundary);
      mapRef.current.off('draw.update', updateBoundary);
      mapRef.current.off('draw.delete');
      mapRef.current.off('draw.finish');
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

// second half

return (
  <div className="map-wrapper">
    {/* Map container */}
    <div ref={mapContainer} className="map-container" />

    {/* Step 0: Intro */}
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

    {/* Step 1: Pin location */}
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
          <p>1. Pan the map until the pin is centered over where you live.<br />
             2. Click the "I Live here!" button</p>
          <div className="overlay-actions">
            <button onClick={handleConfirmLocation}>I live here!</button>
          </div>
        </div>
      </>
    )}

    {/* Step 2: Name + years */}
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

    {/* Step 3A: Drawing instructions */}
    {step === '3A' && (
      <div className="overlay overlay-enter">
        <h2>Where would you mark this neighborhood’s boundaries?</h2>
        <div className="drawing-animation">
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
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              drawRef.current.deleteAll();
              drawRef.current.changeMode('draw_open_polygon', { setBoundary });
              console.log('✅ Switched to draw_open_polygon mode');
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

    {/* Step 3B: Drawing Step */}
    {step === '3B' && drawingStarted && (
      <div className="map-controls">
        <button
          onClick={(ev) => {
            console.log('🧭 Undo button clicked — firing ui:undo');
            ev.stopPropagation();
            ev.preventDefault();
            mapRef.current?.fire('ui:undo');
          }}
        >
          Undo
        </button>

        <button
          className="secondary"
          onClick={(ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            setStep('3A');
          }}
        >
          Show Instructions
        </button>
      </div>
    )}

    {/* Step 3C: Review */}
    {step === '3C' && (
      <div className="overlay overlay-enter">
        <h2>Looking good!</h2>
        <p>If this looks right, press "Next." <br /><br />To try again, press "Draw Again."</p>
        <div className="overlay-actions">
          <button onClick={() => {
            console.log('📐 Confirming boundary:', boundary);
            setStep(4);
          }}>
            Next
          </button>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              drawRef.current.deleteAll();
              drawRef.current.changeMode('draw_open_polygon', { setBoundary });
              setBoundary(null);
              setDrawingStarted(true);
              setStep('3B');
            }}
          >
            Draw Again
          </button>
        </div>
      </div>
    )}

    {/* Step 4: BoundariesForm */}
    {step === 4 && (
      <BoundariesForm
        boundary={boundary}
        location={location}
        years={years}
        areaName={areaName}
        onReset={handleReset}
        onStartOver={startOver}
        onSubmitted={(uuid) => {
          setSubmissionUuid(uuid);
          setStep(5);
          setShowSurveyPrompt(true);
        }}
      />
    )}

    {/* Step 5: Survey prompt */}
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

    {/* Step 5: Survey form */}
    {step === 5 && showSurveyForm && !surveyComplete && (
      <NeighborhoodSurvey
        location={location}
        years={years}
        areaName={areaName}
        boundary={boundary}
        submissionUuid={submissionUuid}
        onComplete={() => {
          setSurveyComplete(true);
        }}
      />
    )}

    {/* Step 5: Survey complete */}
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