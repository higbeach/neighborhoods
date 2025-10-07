require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const turf = require('@turf/turf');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Paths to static files
const dataDir = path.join(__dirname, 'data');
const blocksFile = path.join(dataDir, 'blocks.geojson');

// -------------------- API ROUTES --------------------

// ✅ POST: save a new submission to Supabase
app.post('/api/submissions', async (req, res) => {
  const { geometry, properties } = req.body;

  console.log('📬 Received submission:', req.body); // ← NEW: confirms frontend is reaching backend

  if (!geometry || !properties) {
    return res.status(400).json({ error: 'Missing geometry or properties' });
  }

  try {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from('submissions')
      .insert([
        {
          geometry,
          properties: { ...properties, id, timestamp },
        },
      ]);

    if (error) throw error;

    res.json({ status: 'ok', data });
  } catch (err) {
    console.error('❌ Supabase insert failed:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});


// ✅ GET: return all submissions from Supabase
app.get('/api/submissions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10);

    const query = supabase
      .from('submissions')
      .select('geometry, properties')
      .order('created_at', { ascending: false });

    const { data, error } = isNaN(limit)
      ? await query
      : await query.limit(limit);

    if (error) throw error;

    const features = data.map((row) => ({
      type: 'Feature',
      geometry: row.geometry,
      properties: row.properties,
    }));

    res.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (err) {
    console.error('❌ Supabase fetch failed:', err);
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

// ✅ GET: dynamically generate blocks with votes
app.get('/api/blocks', async (req, res) => {
  try {
    const blocksRaw = fs.readFileSync(blocksFile, 'utf8');
    const blocks = JSON.parse(blocksRaw);

    if (!Array.isArray(blocks.features)) {
      throw new Error("blocks.geojson is missing 'features' array");
    }

    const limit = parseInt(req.query.limit, 10);

    const query = supabase
      .from('submissions')
      .select('geometry')
      .order('created_at', { ascending: false });

    const { data: submissions, error } = isNaN(limit)
      ? await query
      : await query.limit(limit);

    if (error) throw error;

    const submissionsToUse = submissions.map((row) => ({
      type: 'Feature',
      geometry: row.geometry,
    }));

    const blockFeatures = blocks.features.map((block, i) => {
      if (!block.geometry) {
        console.warn(`⚠️ Block ${i} is missing geometry`);
        return {
          ...block,
          properties: {
            ...block.properties,
            votes: 0,
            error: 'Missing geometry',
          },
        };
      }

      let count = 0;
      submissionsToUse.forEach((sub, j) => {
        if (!sub.geometry) return;

        try {
          if (turf.booleanPointInPolygon(sub, block)) {
            count += 1;
          }
        } catch (e) {
          console.error(`❌ Turf error on block ${i}, submission ${j}:`, e);
        }
      });

      return {
        ...block,
        properties: {
          ...block.properties,
          votes: count,
        },
      };
    });

    res.json({
      type: 'FeatureCollection',
      features: blockFeatures,
    });
  } catch (err) {
    console.error('❌ /api/blocks failed:', err);
    res.status(500).json({ error: 'Failed to generate blocks dynamically' });
  }
});

// -------------------- SERVE REACT BUILD --------------------

const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});