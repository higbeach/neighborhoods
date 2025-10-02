import React, { useEffect, useState } from 'react';
import Map from './Map'; // adjust path if needed

const SubmissionsViewer = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://neighborhoods-lgvg.onrender.com/api/submissions')
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ Failed to load submissions:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="overlay overlay-enter">
      <h2>📬 All Submissions</h2>
      {loading ? (
        <p>Loading submissions…</p>
      ) : submissions.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <>
          <Map submissions={submissions} />
          <ul>
            {submissions.map((s, i) => (
              <li key={i}>
                <strong>{s.areaName}</strong> ({s.years})<br />
                <em>
                  {s.location && typeof s.location === 'object'
                    ? `Lat: ${s.location.lat}, Lng: ${s.location.lng}`
                    : s.location}
                </em>
                <br />
                <p>{s.changes || 'No comments provided.'}</p>
                <small>{new Date(s.timestamp).toLocaleString()}</small>
                <hr />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SubmissionsViewer;