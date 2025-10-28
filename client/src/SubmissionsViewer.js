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

          const validFeatures = data.features.filter((f, i) => {
            const isValid =
              f &&
              f.type === 'Feature' &&
              f.geometry &&
              typeof f.geometry.type === 'string' &&
              Array.isArray(f.geometry.coordinates);

            if (!isValid) {
              console.warn(`⚠️ Feature ${i} is invalid:`, f);
            }

            return isValid;
          });

          console.log(`✅ Valid features: ${validFeatures.length}`);

          if (
            !data ||
            data.type !== 'FeatureCollection' ||
            !Array.isArray(data.features)
          ) {
            console.error('❌ Top-level GeoJSON structure is invalid:', data);
            return;
          }

          const cleanedData = {
            type: 'FeatureCollection',
            features: validFeatures
              .filter(f => f.properties?.archived !== true)
              .map((f, i) => {
                const id = f.id || f.properties?.id || f.properties?.uuid || `feature-${i}`;
                return { ...f, id };
              }),
          };



          if (!cleanedData.features || cleanedData.features.length === 0) {
           console.warn('⚠️ No features returned from server:', cleanedData);
          }

          console.log('🧼 Cleaned GeoJSON:', cleanedData);
          setSubmissions(cleanedData);


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