const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const lld = req.query.lld;
  const apiKey = process.env.TOWNSHIP_API_KEY;
  

  if (!lld) {
    return res.status(400).json({ error: 'Missing LLD parameter' });
  }

  const apiUrl = `https://api.townshipcanada.com/api/v1/search?query=${encodeURIComponent(lld)}`;


  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }

    });


    const data = await response.json();
    console.log("LLD requested:", lld);
    console.log("Full API response:", JSON.stringify(data, null, 2));


    const pointFeature = data.features?.find(f => f.geometry?.type === 'Point');

    if (!pointFeature) {
      return res.status(404).json({ error: 'No coordinates found' });
    }

    const [longitude, latitude] = pointFeature.geometry.coordinates;

    return res.status(200).json({ latitude, longitude });
  } catch (error) {
    console.error("Fetch failed:", error);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
};
