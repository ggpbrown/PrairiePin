const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/convert', async (req, res) => {
  const lld = req.query.lld;
  const apiKey = process.env.TOWNSHIP_API_KEY;

  if (!lld) {
    return res.status(400).json({ error: 'Missing LLD parameter' });
  }

  const apiUrl = `https://developer.townshipcanada.com/search/legal-location?location=${encodeURIComponent(lld)}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    const pointFeature = data.features?.find(
  (f) => f.geometry?.type === 'Point'
);

if (!pointFeature) {
  return res.status(404).json({ error: 'No coordinates found' });
}

const [longitude, latitude] = pointFeature.geometry.coordinates;

res.status(200).json({ latitude, longitude });
  } catch (error) {
    console.error("Fetch failed:", error);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
