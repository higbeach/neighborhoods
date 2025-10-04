import React, { useState } from 'react';

const BoundariesForm = ({ boundary, location, years, areaName, onReset, onSubmitted }) => {
  const [comments, setComments] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!boundary) {
      alert('Please draw a boundary before submitting.');
      return;
    }

    // Build GeoJSON Feature
    const feature = {
      type: 'Feature',
      geometry: boundary.geometry, // boundary is a full Feature, so use its geometry
      properties: {
        neighborhood: areaName,
        years,
        comments,
        location,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feature),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      await res.json();
      console.log('✅ Saved submission:', feature);

      // Advance wizard to step 5 (thank‑you overlay)
      onSubmitted();
    } catch (err) {
      console.error('Error saving submission:', err.message);
      alert('Error saving submission. See console for details.');
    }
  };

  return (
    <div className="overlay overlay-enter">
      <h2>Step 4: Confirm & Submit</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Comments:
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </label>
        <div className="overlay-actions">
          <button type="submit">Submit</button>
          <button type="button" className="secondary" onClick={onReset}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default BoundariesForm;