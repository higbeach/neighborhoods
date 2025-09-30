import React, { useState, useEffect } from 'react';

const BoundariesForm = ({ boundary, location, years, areaName, onReset, onSubmitted }) => {
  const [changes, setChanges] = useState('');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation on mount
    const t = setTimeout(() => setAnimate(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submission = {
      areaName,
      years,
      changes,       // optional text
      location,      // { lng, lat }
      boundary       // GeoJSON feature for the polygon
    };

    try {
      const res = await fetch('http://localhost:4000/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (res.ok) {
        console.log('✅ Submission saved:', submission);
        onSubmitted(); // advance to Thank You step
      } else {
        console.error('❌ Error saving submission:', res.statusText);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
    }
  };

  return (
    <div className={`overlay ${animate ? 'overlay-enter' : ''}`}>
      <h2>Step 4: Optional Questions?</h2>
      <p className="question">
        How would you say these boundaries changed over the years? (optional)
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Your thoughts (optional)"
          value={changes}
          onChange={(e) => setChanges(e.target.value)}
          rows={4}
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

export default BoundariesForm;