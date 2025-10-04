const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.get("/submissions", (req, res) => {
  try {
    const submissionsPath = path.join(__dirname, "../data/submissions.geojson");
    const submissions = JSON.parse(fs.readFileSync(submissionsPath, "utf8"));
    res.json(submissions);
  } catch (err) {
    console.error("Error loading submissions:", err);
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

module.exports = router;