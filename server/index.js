// server/index.js
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
    'https://neighborhoods.buddybuilds.site' // ← replace with your actual frontend domain if different
  ]
}));

app.use(bodyParser.json());

// Path to submissions file
const submissionsFile = path.join(__dirname, 'submissions.json');

// Ensure file exists
if (!fs.existsSync(submissionsFile)) {
  fs.writeFileSync(submissionsFile, JSON.stringify([]));
}

// POST endpoint to save a submission
app.post('/api/submissions', (req, res) => {
  const newSubmission = req.body;

  // Load existing submissions
  const data = fs.readFileSync(submissionsFile);
  const submissions = JSON.parse(data);

  // Add timestamp
  newSubmission.timestamp = new Date().toISOString();

  // Save
  submissions.push(newSubmission);
  fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2));

  res.json({ status: 'ok', submission: newSubmission });
});

// GET endpoint to fetch all submissions
app.get('/api/submissions', (req, res) => {
  const data = fs.readFileSync(submissionsFile);
  const submissions = JSON.parse(data);
  res.json(submissions);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
