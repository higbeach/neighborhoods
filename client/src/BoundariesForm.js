import React, { useState } from 'react';

const BoundariesForm = ({ draw }) => {
  const [neighborhood, setNeighborhood] = useState('');
  const [years, setYears] = useState('');
  const [comments, setComments] = useState('');
  const [success, setSuccess] = useState(false); // inline confirmation

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      await res.json();

      // Inline confirmation; keep the form and map exactly where they are
      setSuccess(true);
      // Reset fields but DO NOT clear the drawing (keeps map context and layout)
      setNeighborhood('');
      setYears('');
      setComments('');

      // If you want the drawing cleared after submit, uncomment:
      // draw.deleteAll();
    } catch (err) {
      console.error('Error saving submission:', err.message);
      alert('Error saving submission. See console for details.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      {success && (
        <div style={{ marginBottom: '0.75rem', color: '#0a6' }}>
          ✅ Your boundary was saved. You can add another or adjust the map.
        </div>
      )}

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

      <button type="submit">Next</button>
    </form>
  );
};

export default BoundariesForm;