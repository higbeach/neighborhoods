import React, { useEffect, useState } from 'react';
import SubmissionsMap from './SubmissionsMap';

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
    <div style={{ width: '100vw', height: '100vh' }}>
      {loading ? <p>Loading map…</p> : <SubmissionsMap submissions={submissions} />}
    </div>
  );
};

export default SubmissionsViewer;