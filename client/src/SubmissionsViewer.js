// ✅ Confirmed backend URL: neighborhoods-server.onrender.com

import React, { useEffect, useState } from 'react';
import SubmissionsMap from './SubmissionsMap';

const SubmissionsViewer = () => {
  const [submissions, setSubmissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetch('https://neighborhoods-server.onrender.com/api/submissions');
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.error('❌ Server did not return valid JSON:', text);
          throw new Error(`Invalid JSON: ${text}`);
        }

        if (!res.ok) {
          console.error('❌ Failed to load submissions:', data.error || res.statusText);
          throw new Error(data.error || res.statusText);
        }

        console.log('📦 Loaded submissions:', data);
        setSubmissions(data);
      } catch (err) {
        console.error('🚨 Error fetching submissions:', err.message);
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