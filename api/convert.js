// Vercel Function: /api/convert.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const lld = req.query.lld;
  const apiKey = process.env.TOWNSHIP_API_KEY;

  if (!lld) {
    return res.status(400).json({ error: 'Missing LLD parameter' });
  }

  const apiUrl = `https://api.townshipcanada.com/api/v1/search?query=${encodeURIComponent(lld)}`;
  console.log("Calling:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();
    const pointFeature = data.features.find(f => f.geometry.type === 'Point');

    if (!pointFeature) {
      return res.status(404).json({ error: 'No coordinates found' });
    }

    const [longitude, latitude] = pointFeature.geometry.coordinates;
    return res.status(200).json({ latitude, longitude });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
};
