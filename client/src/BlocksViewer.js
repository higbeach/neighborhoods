import React, { useEffect, useState } from 'react';
import BlocksMap from './BlocksMap';

const BlocksViewer = () => {
  const [blocks, setBlocks] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      console.time('⏱️ Map data fetch');

      try {
        const baseUrl =
          process.env.NODE_ENV === 'development'
            ? ''
            : 'https://neighborhoods-lgvg.onrender.com';

        const blocksRes = await fetch(`${baseUrl}/api/blocks`);
        const submissionsRes = await fetch(`${baseUrl}/api/submissions`);

        if (!blocksRes.ok) {
          throw new Error(`Failed to fetch /api/blocks: ${blocksRes.status}`);
        }
        if (!submissionsRes.ok) {
          throw new Error(`Failed to fetch /api/submissions: ${submissionsRes.status}`);
        }

        const blocksData = await blocksRes.json();
        const submissionsData = await submissionsRes.json();

        if (!blocksData?.features || !Array.isArray(blocksData.features)) {
          throw new Error('Invalid blocks GeoJSON structure');
        }
        if (!submissionsData?.features || !Array.isArray(submissionsData.features)) {
          throw new Error('Invalid submissions GeoJSON structure');
        }

        setBlocks(blocksData);
        setSubmissions(submissionsData);
        console.timeEnd('⏱️ Map data fetch');
      } catch (err) {
        console.error('❌ Map data fetch failed:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {loading && <p>Loading map data…</p>}
      {error && <p style={{ color: 'red', padding: '1rem' }}>⚠️ Error: {error}</p>}
      {!loading && !error && blocks?.features?.length === 0 && (
        <p>No blocks found.</p>
      )}
      {!loading && !error && blocks && submissions && (
        <BlocksMap blocks={blocks} submissions={submissions} />
      )}
    </div>
  );
};

export default BlocksViewer;
