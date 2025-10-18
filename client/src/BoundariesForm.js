import React, { useState } from 'react';

const BoundariesForm = ({ boundary, location, years, areaName, onReset, onStartOver, onSubmitted }) => {
  console.log('📦 BoundariesForm loaded');

  const [comments, setComments] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!boundary) {
      alert('Please draw a boundary before submitting.');
      return;
    }

    const ip = await fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => null); // fallback if it fails

    // Build GeoJSON Feature (backend will add id + timestamp)
    const feature = {
      type: 'Feature',
      geometry: boundary.geometry,
      properties: {
        neighborhood: areaName,
        years,
        comments,
        location,
        ip_address: ip, // ✅ this is the new line
      },
    };

    try {
      const res = await fetch(
        'https://neighborhoods-server.onrender.com/api/submissions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feature),
        }
      );

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('❌ Server did not return valid JSON:', text);
        throw new Error(`Server did not return JSON: ${text}`);
      }

      if (!res.ok) {
        console.error('❌ Submission failed:', data.error || res.statusText);
        throw new Error(data.error || res.statusText);
      }

      console.log('✅ Full backend response:', data);
      console.log('📍 Saved feature:', data.feature || '(no feature returned)');

      onSubmitted(); // advance to thank‑you step
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
          Leave your commments here. (optional)<br />
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