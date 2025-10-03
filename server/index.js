require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ CORS: allow requests from your live frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ourlivingneighborhoods.org' // ← replace if your frontend domain changes
  ]
}));

app.use(bodyParser.json());

// Path to submissions file (GeoJSON)
const submissionsFile = path.join(__dirname, 'submissions.geojson');

// Ensure file exists with empty FeatureCollection
if (!fs.existsSync(submissionsFile)) {
  fs.writeFileSync(
    submissionsFile,
    JSON.stringify({ type: 'FeatureCollection', features: [] }, null, 2)
  );
}

// POST endpoint to save a submission
app.post('/api/submissions', (req, res) => {
  const { geometry, properties } = req.body;

  if (!geometry || !properties) {
    return res.status(400).json({ error: 'Missing geometry or properties' });
  }

  // Load existing FeatureCollection
  const data = JSON.parse(fs.readFileSync(submissionsFile));

  // Build new Feature
  const feature = {
    type: 'Feature',
    geometry,
    properties: {
      ...properties,
      timestamp: new Date().toISOString()
    }
  };

  // Append and save
  data.features.push(feature);
  fs.writeFileSync(submissionsFile, JSON.stringify(data, null, 2));

  res.json({ status: 'ok', feature });
});

// GET endpoint to fetch all submissions
app.get('/api/submissions', (req, res) => {
  const data = JSON.parse(fs.readFileSync(submissionsFile));
  res.json(data);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});