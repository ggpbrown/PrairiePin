const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express(); // move this ABOVE app.use
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: 'https://prairiepin-auth.netlify.app', // This should match your Netlify *auth* subdomain
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json()); // don't forget this if you're accepting JSON bodies


app.get('/convert', async (req, res) => {
  const lld = req.query.lld;
  const apiKey = process.env.TOWNSHIP_API_KEY;
  const authRoutes = require('./server/auth');
  app.use(express.json());
  app.use(authRoutes);


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

    console.log("LLD requested:", lld);
    console.log("Full API response:", JSON.stringify(data, null, 2));
    

    const pointFeature = data.features?.find(
      (f) => f.geometry?.type === 'Point'
    );

    if (!pointFeature) {
      return res.status(404).json({ error: 'No coordinates found!' });
    }

    const [longitude, latitude] = pointFeature.geometry.coordinates;

    return res.status(200).json({ latitude, longitude });
    
  } catch (error) {
    console.error("Fetch failed:", error);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
