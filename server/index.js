require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const turf = require('@turf/turf');   // 👈 new dependency

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Paths to data files
const dataDir = path.join(__dirname, 'data');
const submissionsFile = path.join(dataDir, 'submissions.geojson');
const blocksFile = path.join(dataDir, 'blocks.geojson'); // base block geometries

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
    // Load base blocks
    const blocks = JSON.parse(fs.readFileSync(blocksFile, 'utf8'));

    // Load submissions
    const submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));

    // Aggregate votes by block
    const blockFeatures = blocks.features.map((block) => {
      let count = 0;
      submissions.features.forEach((sub) => {
        if (turf.booleanPointInPolygon(sub, block)) {
          count += 1;
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
    console.error('Error generating blocks dynamically:', err);
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
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));

  // Catch‑all: send index.html for non‑API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// -------------------- START SERVER --------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});