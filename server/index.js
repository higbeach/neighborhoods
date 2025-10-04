require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Paths to data files
const dataDir = path.join(__dirname, 'data');
const submissionsFile = path.join(dataDir, 'submissions.geojson');
const blocksVotesFile = path.join(dataDir, 'blocks_with_votes.geojson');

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

// GET: return blocks_with_votes.geojson
app.get('/api/blocks', (req, res) => {
  try {
    const raw = fs.readFileSync(blocksVotesFile, 'utf8');
    res.type('application/json').send(raw);
  } catch (err) {
    console.error('Error reading blocks_with_votes:', err);
    res.status(500).json({ error: 'Failed to load blocks_with_votes' });
  }
});

// -------------------- SERVE REACT BUILD --------------------

// If you’re serving your React build from Express, include this:
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