import React, { useEffect, useState } from 'react';
import BlocksMap from './BlocksMap';

const BlocksViewer = () => {
  const [blocks, setBlocks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        // Decide which base URL to use
        const baseUrl =
          process.env.NODE_ENV === 'development'
            ? '' // in dev, proxy will forward /api/* to localhost:4000
            : 'https://neighborhoods-lgvg.onrender.com'; // your deployed backend

        const res = await fetch(`${baseUrl}/api/blocks`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        setBlocks(data);
      } catch (err) {
        console.error('❌ Failed to load blocks_with_votes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlocks();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {loading && <p>Loading blocks…</p>}
      {!loading && blocks && <BlocksMap blocks={blocks} />}
    </div>
  );
};

export default BlocksViewer;