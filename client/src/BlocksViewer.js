import React, { useEffect, useState } from 'react';
import BlocksMap from './BlocksMap';

const BlocksViewer = () => {
  const [blocks, setBlocks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const res = await fetch('https://neighborhoods-lgvg.onrender.com/api/blocks'); // backend URL
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