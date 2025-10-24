import React, { useState } from 'react';

const BoundariesForm = ({
  boundary,
  location,
  years,
  areaName,
  onReset,
  onStartOver,
  onSubmitted, // expects a UUID
}) => {
  console.log('📦 BoundariesForm loaded');

  const [comments, setComments] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!boundary) {
      alert('Please draw a boundary before submitting.');
      console.warn('⚠️ Submit blocked — no boundary present');
      return;
    }

    const coords = boundary.geometry?.coordinates;
    const ring = coords?.[0];

    console.log('📦 Geometry type:', boundary.geometry?.type);
    console.log('📦 First coord:', ring?.[0]);
    console.log('📦 Last coord:', ring?.[ring?.length - 1]);

    // Relaxed closure tolerance (handles FP precision)
    const isClosed = (() => {
      if (!Array.isArray(ring) || ring.length < 4) return false;
      const [x1, y1] = ring[0];
      const [x2, y2] = ring[ring.length - 1];
      const dx = x1 - x2;
      const dy = y1 - y2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log('📦 Closure distance:', distance);
      return distance < 0.0001;
    })();

    console.log('📦 isClosed:', isClosed);

    const isValidPolygon =
      boundary.geometry?.type === 'Polygon' &&
      Array.isArray(coords) &&
      coords.length > 0 &&
      isClosed;

    console.log('📦 isValidPolygon:', isValidPolygon);

    if (!isValidPolygon) {
      alert('Your boundary is incomplete or malformed. Please redraw it before submitting.');
      console.error('❌ Invalid polygon — boundary:', boundary);
      return;
    }

    const ip = await fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => data.ip)
      .catch(() => null);

    const feature = {
      type: 'Feature',
      geometry: boundary.geometry,
      properties: {
        neighborhood: areaName,
        years,
        comments,
        location,
        ip_address: ip,
      },
    };

    try {
      const res = await fetch('https://neighborhoods-server.onrender.com/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feature),
      });

      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        console.error('❌ Server did not return valid JSON:', text);
        throw new Error(`Server did not return JSON: ${text}`);
      }

      if (!res.ok) {
        console.error('❌ Submission failed:', parsed.error || res.statusText);
        throw new Error(parsed.error || res.statusText);
      }

      console.log('📦 Raw backend data:', parsed.data);

      const insertedUuid =
        Array.isArray(parsed.data) && parsed.data.length > 0
          ? parsed.data[0].uuid
          : undefined;

      console.log('📦 Inserted row:', parsed.data?.[0]);

      if (!insertedUuid) {
        console.warn('⚠️ No UUID returned from backend. Survey update may fail.');
      }

      console.log('✅ Full backend response:', parsed);
      console.log('📦 Inserted UUID:', insertedUuid);

      onSubmitted(insertedUuid);
    } catch (err) {
      console.error('🚨 Error saving submission:', err.message);
      alert('Error saving submission. See console for details.');
    }
  };

  return (
    <div className="overlay overlay-enter">
      <h2>Confirm & Submit</h2>
      <form onSubmit={handleSubmit}>
        <p>
          How would you say these boundaries have changed over the year? <br /><br />
          Does this neighborhood go by any other names, or has it gone by other names in the past? <br /><br />
          Leave your comments here. (optional)<br />
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </p>
        <div className="overlay-actions">
          <button type="submit">Submit</button>
          <button type="button" className="secondary" onClick={onStartOver}>
            Start Over
          </button>
        </div>
      </form>
    </div>
  );
};

export default BoundariesForm;