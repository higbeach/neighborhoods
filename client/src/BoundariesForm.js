import React, { useState } from 'react';

const BoundariesForm = ({ boundary, location, years, areaName, onReset, onSubmitted }) => {
  const [comments, setComments] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!boundary) {
      alert('Please draw a boundary before submitting.');
      return;
    }

    // Build GeoJSON Feature (no id — backend will add one)
    const feature = {
      type: 'Feature',
      geometry: boundary.geometry,
      properties: {
        neighborhood: areaName,
        years,
        comments,
        location,
      },
    };

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feature),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server did not return JSON: ${text}`);
      }

      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }

      console.log('✅ Saved submission:', data.feature);
      onSubmitted(); // advance to thank-you step
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