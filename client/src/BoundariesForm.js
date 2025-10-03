import React, { useState } from 'react';

const BoundariesForm = ({ draw }) => {
  const [neighborhood, setNeighborhood] = useState('');
  const [years, setYears] = useState('');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false); // track confirmation step

  const handleSubmit = async () => {
    // Get the first drawn feature from Mapbox Draw
    const drawn = draw.getAll();
    if (!drawn.features.length) {
      alert('Please draw a boundary on the map before submitting.');
      return;
    }

    const geometry = drawn.features[0].geometry;

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometry,
          properties: {
            neighborhood,
            years,
            comments,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const data = await res.json();
      console.log('✅ Saved submission:', data);

      // Reset form fields
      setNeighborhood('');
      setYears('');
      setComments('');
      draw.deleteAll();

      // Show confirmation step
      setSubmitted(true);
    } catch (err) {
      console.error('Error saving submission:', err.message);
      alert('Error saving submission. See console for details.');
    }
  };

  // If already submitted, show confirmation step
  if (submitted) {
    return (
      <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h3>✅ Thank you!</h3>
        <p>Your boundary has been saved.</p>
        <button onClick={() => setSubmitted(false)}>Add Another</button>
      </div>
    );
  }

  // Otherwise show the form
  return (
    <div style={{ marginTop: '1rem' }}>
      <div>
        <label>
          Neighborhood Name:
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Years Lived:
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Comments:
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </label>
      </div>
      <button type="button" onClick={handleSubmit}>
        Next
      </button>
    </div>
  );
};

export default BoundariesForm;