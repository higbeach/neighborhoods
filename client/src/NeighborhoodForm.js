import React, { useState, useEffect } from 'react';

const NeighborhoodForm = ({ boundary, location, years, onReset, onSubmitted }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 0);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submission = { name, notes, years, location, boundary };
    console.log('Submitting:', submission);
    onSubmitted();
  };

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