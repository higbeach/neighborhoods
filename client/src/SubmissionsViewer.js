import React, { useEffect, useState } from 'react';
import SubmissionsMap from './SubmissionsMap';

const SubmissionsViewer = () => {
  const [submissions, setSubmissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetch('https://neighborhoods-lgvg.onrender.com/api/submissions'); // ✅ full backend URL
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        setSubmissions(data);
      } catch (err) {
        console.error('❌ Failed to load submissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {loading && <p>Loading map…</p>}
      {!loading && submissions && (
        <SubmissionsMap submissions={submissions} />
      )}
    </div>
  );
};

export default SubmissionsViewer;