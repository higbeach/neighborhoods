import React, { useState, useEffect } from 'react';

const BoundariesForm = ({ boundary, location, years, areaName, onReset, onSubmitted }) => {
  const [changes, setChanges] = useState('');
  const [animate, setAnimate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const submission = {
      areaName,
      years,
      changes,
      location,
      boundary,
    };

    // Replace with your actual Render backend URL
    const endpoint = 'https://your-app-name.onrender.com/api/submissions';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (res.ok) {
        console.log('✅ Submission saved:', submission);
        onSubmitted();
      } else {
        setError(`Server error: ${res.statusText}`);
        console.error('❌ Error saving submission:', res.statusText);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('❌ Network error:', err);
    } finally {
      setSubmitting(false);
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
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div className="overlay-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onReset}
            disabled={submitting}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default BoundariesForm;