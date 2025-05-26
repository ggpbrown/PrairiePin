const express = require('express');
const fetch = require('node-fetch'); // If not already included
const router = express.Router();

const TA_API_KEY = process.env.TA_API_KEY;

router.get('/test-ta-lookup', async (req, res) => {
    console.log(`🎯 Received request for test-ta-lookup`);
  const testLocations = [
    "T9N R8E Sec 14",
    "T28N R36W Sec 8",
    "T30N R28W Sec 25",
    "T37S R37W Sec 31",
    "T50S R44W Sec 4"
  ];

  const results = [];

  for (const location of testLocations) {
    const formattedLocation = encodeURIComponent(location);
    const url = `https://developer.townshipamerica.com/search/legal-location?location=${formattedLocation}`;

    try {
      const response = await fetch(url, {
        headers: {
          'x-api-key': TA_API_KEY
        }
      });

      const data = await response.json();
      results.push({ location, data });
    } catch (error) {
      results.push({ location, error: error.message });
    }
  }

  res.json(results);
});

module.exports = router;