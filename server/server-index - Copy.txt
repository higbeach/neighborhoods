require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ CORS fix: allow both dev and production domains
app.use(cors({
  origin: [
    'https://neighborhoods-dxab.onrender.com',
    'https://ourlivingneighborhoods.org',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true
}));

app.use(bodyParser.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Paths to static files
const dataDir = path.join(__dirname, 'data');
const blocksFile = path.join(dataDir, 'blocks_with_votes.geojson');

// -------------------- API ROUTES --------------------

// ✅ POST: save a new submission to Supabase
app.post('/api/submissions', async (req, res) => {
  const { geometry, properties } = req.body;

  console.log('📬 Received submission:', req.body);

  if (!geometry || !properties) {
    return res.status(400).json({ error: 'Missing geometry or properties' });
  }

  try {
    const id = crypto.randomUUID();
    const timestamp = new Date().toLocaleString('sv-SE', {
      timeZone: 'America/Los_Angeles',
      hour12: false,
    });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const { data, error } = await supabase
      .from('submissions')
      .insert([
        {
          geometry,
          properties: { ...properties, id, timestamp },
          ip_address: ip,
        },
      ])
      .select('uuid'); // ✅ Explicitly return the UUID field

    console.log('📦 Inserted row:', data?.[0]);
    console.log('🧾 Supabase insert result:', { data, error });

    if (error) throw error;

    res.json({ status: 'ok', data });
  } catch (err) {
    console.error('❌ Supabase insert failed:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// ✅ PATCH: update survey data for a submission
app.patch('/api/submissions/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const { survey, comments, timestamp, ...restUpdates } = req.body;

  console.log('📬 Survey update received for UUID:', uuid);
  console.log('📦 Update payload:', req.body);

  try {
    // Fetch existing properties
    const { data: existingRows, error: fetchError } = await supabase
      .from('submissions')
      .select('properties')
      .eq('uuid', uuid)
      .limit(1);

    if (fetchError) throw fetchError;

    const existingProps = Array.isArray(existingRows) && existingRows.length > 0
      ? existingRows[0].properties
      : {};

    console.log('🔍 Existing properties:', existingProps);

    console.log('📦 Incoming update pieces:', {
      survey,
      comments,
      timestamp,
      restUpdates
    });

    // Merge new updates into existing properties
   const mergedProps = {
      ...existingProps,
      ...restUpdates,
      survey,
      comments:
        comments && comments.trim().length > 0
          ? comments
          : existingProps.comments ?? null,
      timestamp: timestamp ?? existingProps.timestamp ?? null
    };


  // ✅ Optional log goes right here:
    console.log('🧬 Final mergedProps:', mergedProps);


    // 🔍 Confirm Supabase can match the UUID
    const { data: matchTest, error: matchError } = await supabase
      .from('submissions')
      .select('uuid')
      .eq('uuid', uuid);

    console.log('🔍 Match test result:', { matchTest, matchError });

    // ✅ Perform the update
    const { data: updateResult, error: updateError } = await supabase
      .from('submissions')
      .update({ properties: mergedProps })
      .match({ uuid });

    if (updateError) throw updateError;

    console.log('🧾 Supabase update result:', updateResult);

    if (!updateResult || updateResult.length === 0) {
      console.warn('⚠️ No rows were updated. UUID may not match any record.');
    } else {
      console.log('✅ Properties updated successfully');
    }

    // Confirm final row state
    const { data: confirmRow, error: confirmError } = await supabase
      .from('submissions')
      .select('properties')
      .eq('uuid', uuid)
      .limit(1);

    console.log('🔍 Confirmed updated row:', confirmRow);

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('❌ Survey update failed:', {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code,
    });
    res.status(500).json({ error: 'Failed to update survey' });
  }
});


// ✅ GET: return all submissions from Supabase
app.get('/api/submissions', async (req, res) => {
  try {
    console.log('📡 Incoming request: GET /api/submissions');
    const limit = parseInt(req.query.limit, 10);
    console.log('🔢 Limit param:', isNaN(limit) ? 'none' : limit);

    const query = supabase
      .from('submissions')
      .select('geometry, properties, created_at, archived, uuid')
      .order('created_at', { ascending: false });

    const { data, error } = isNaN(limit)
      ? await query
      : await query.limit(limit);

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    if (!Array.isArray(data)) {
      console.error('❌ Supabase returned non-array:', data);
      throw new Error('Invalid data format from Supabase');
    }

    const features = data.map((row, i) => {
      if (!row.geometry || !row.properties) {
        console.warn(`⚠️ Submission ${i} missing geometry or properties`);
      }
      return {
        type: 'Feature',
        geometry: row.geometry,
        id: row.uuid || row.properties?.id || `feature-${i}`, // ✅ assign stable ID
        properties: {
          ...row.properties,
          created_at: row.created_at,
          archived: row.archived ?? false,
          uuid: row.uuid
        }
      };

    });

    console.log(`✅ Returning ${features.length} submissions`);
    res.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (err) {
    console.error('❌ Supabase insert failed:', {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code,
    });
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// ✅ GET: serve enriched blocks with votes
app.get('/api/blocks', (req, res) => {
  try {
    const blocksRaw = fs.readFileSync(blocksFile, 'utf8');
    const blocks = JSON.parse(blocksRaw);
    res.json(blocks);
  } catch (err) {
    console.error('❌ /api/blocks failed:', err);
    res.status(500).json({ error: 'Failed to load blocks' });
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