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

// 🔒 Temporarily disabled to prevent crash loop
// app.post('/api/submissions', ...);
// app.get('/api/submissions', ...);
// app.get('/api/blocks', ...);

// -------------------- DEBUG ROUTES --------------------

app.get('/api/debug/blocks-exists', (req, res) => {
  const blocksPath = path.join(__dirname, 'data', 'blocks.geojson');
  const exists = fs.existsSync(blocksPath);
  res.json({ blocksFileExists: exists });
});

app.get('/api/debug/submissions-preview', (req, res) => {
  try {
    const raw = fs.readFileSync(submissionsFile, 'utf8');
    const data = JSON.parse(raw);
    res.json({ ok: true, featuresCount: data.features?.length || 0 });
  } catch (err) {
    console.error('❌ Failed to preview submissions.geojson:', err);
    res.status(500).json({ error: 'Could not read submissions.geojson' });
  }
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