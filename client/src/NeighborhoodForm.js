import React, { useState, useEffect } from 'react';

const NeighborhoodForm = ({ boundary, location, years, onReset, onSubmitted }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [animate, setAnimate] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build GeoJSON Feature
    const feature = {
      type: 'Feature',
      geometry: boundary, // boundary should already be a valid GeoJSON geometry
      properties: {
        neighborhood: name,
        notes,
        years,
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

      setSubmitted(true); // show confirmation
      onSubmitted?.();    // let parent know if needed
    } catch (err) {
      console.error('Error saving submission:', err.message);
      alert('Error saving submission. See console for details.');
    }
  };

  if (submitted) {
    return (
      <div className={`overlay ${animate ? 'overlay-enter' : ''}`}>
        <h2>✅ Thank you!</h2>
        <p>Your neighborhood boundary has been saved.</p>
        <div className="overlay-actions">
          <button type="button" onClick={onReset}>
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`overlay ${animate ? 'overlay-enter' : ''}`}>
      <h2>Step 4: Name Your Neighborhood</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Neighborhood name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <br /><br />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        <br /><br />
        <div className="overlay-actions">
          <button type="submit">Submit</button>
          <button
            type="button"
            className="secondary"
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default NeighborhoodForm;