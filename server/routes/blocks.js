const express = require("express");
const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");

const router = express.Router();

// Load blocks geometry once at startup
const blocksPath = path.join(__dirname, "../data/blocks.geojson");
const blocks = JSON.parse(fs.readFileSync(blocksPath, "utf8"));

router.get("/blocks", (req, res) => {
  try {
    // Load latest submissions each time
    const submissionsPath = path.join(__dirname, "../data/submissions.geojson");
    const submissions = JSON.parse(fs.readFileSync(submissionsPath, "utf8"));

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

    // Return as GeoJSON
    res.json({
      type: "FeatureCollection",
      features: blockFeatures,
    });
  } catch (err) {
    console.error("Error generating blocks:", err);
    res.status(500).json({ error: "Failed to generate blocks dynamically" });
  }
});

module.exports = router;