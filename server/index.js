require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const turf = require('@turf/turf');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Paths to data files
const dataDir = path.join(__dirname, 'data');
const submissionsFile = path.join(dataDir, 'submissions.geojson');
const blocksFile = path.join(dataDir, 'blocks.geojson');

// Ensure submissions file exists
if (!fs.existsSync(submissionsFile)) {
  fs.writeFileSync(
    submissionsFile,
    JSON.stringify({ type: 'FeatureCollection', features: [] }, null, 2)
  );
}

// Helper to generate unique IDs
function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
}

// -------------------- API ROUTES --------------------

// POST: save a new submission
app.post('/api/submissions', (req, res) => {
  const { geometry, properties } = req.body;

  if (!geometry || !properties) {
    return res.status(400).json({ error: 'Missing geometry or properties' });
  }

  try {
    const raw = fs.readFileSync(submissionsFile, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data.features)) {
      data.features = [];
    }

    const id = generateId();
    const feature = {
      type: 'Feature',
      id,
      geometry,
      properties: {
        ...properties,
        id,
        timestamp: new Date().toISOString(),
      },
    };

    data.features.push(feature);
    fs.writeFileSync(submissionsFile, JSON.stringify(data, null, 2));

    res.json({ status: 'ok', feature });
  } catch (err) {
    console.error('Error saving submission:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// GET: return all submissions
app.get('/api/submissions', (req, res) => {
  try {
    const raw = fs.readFileSync(submissionsFile, 'utf8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    console.error('Error reading submissions:', err);
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

// GET: dynamically generate blocks with votes
app.get('/api/blocks', (req, res) => {
  try {
    const blocksRaw = fs.readFileSync(blocksFile, 'utf8');
    const submissionsRaw = fs.readFileSync(submissionsFile, 'utf8');

    const blocks = JSON.parse(blocksRaw);
    const submissions = JSON.parse(submissionsRaw);

    if (!Array.isArray(blocks.features)) {
      throw new Error("blocks.geojson is missing 'features' array");
    }

    if (!Array.isArray(submissions.features)) {
      throw new Error("submissions.geojson is missing 'features' array");
    }

    const blockFeatures = blocks.features.map((block, i) => {
      if (!block.geometry) {
        console.warn(`⚠️ Block ${i} is missing geometry`);
        return block;
      }

      let count = 0;
      submissions.features.forEach((sub, j) => {
        if (!sub.geometry) {
          console.warn(`⚠️ Submission ${j} is missing geometry`);
          return;
        }

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

// -------------------- DEBUG ROUTES --------------------

app.get('/api/debug/blocks-exists', (req, res) => {
  const blocksPath = path.join(__dirname, 'data', 'blocks.geojson');
  const exists = fs.existsSync(blocksPath);
  res.json({ blocksFileExists: exists });
});

// -------------------- SERVE REACT BUILD --------------------

const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));

// Serve React index.html for all non-API routes
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});