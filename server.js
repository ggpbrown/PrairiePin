const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const { router: authRoutes } = require('./server/auth');
const dashboardRoutes = require('./server/dashboard');
const lookupRoutes = require('./server/lookups');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🌐 CORS setup for Netlify frontend
app.use(cors({
  origin: 'https://prairiepin-auth.netlify.app',
  credentials: true
}));

app.use(express.json());
app.use(authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use(lookupRoutes);

// ✅ Route to convert LLD to Lat/Long
app.get('/convert', async (req, res) => {
  console.log("✅ Reached /convert");
  console.log("➡️ Authorization Header:", req.headers.authorization);

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
    const pointFeature = data.features?.find(f => f.geometry?.type === 'Point');

    if (!pointFeature) {
      return res.status(404).json({ error: 'No coordinates found!' });
    }

    const [longitude, latitude] = pointFeature.geometry.coordinates;

    // 📌 Log the lookup if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        await pool.query(
          'INSERT INTO lookups (user_id, lld_entered, latitude, longitude) VALUES ($1, $2, $3, $4)',
          [decoded.userId, lld, latitude, longitude]
        );

        console.log(`📌 Logged lookup for user ${decoded.userId}`);
      } catch (err) {
        console.warn("🔐 Invalid or missing token; skipping log.");
      }
    }

    return res.json({ latitude, longitude });
  } catch (error) {
    console.error("🔥 Fetch failed:", error);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
