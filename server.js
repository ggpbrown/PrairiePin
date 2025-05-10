// 📦 Core Dependencies
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

// 🧩 Route Modules
const { router: authRoutes } = require('./server/auth');
const dashboardRoutes = require('./server/dashboard');
const lookupRoutes = require('./server/lookups');
const adminRoutes = require('./server/admin');

// 🚀 Express App Initialization
const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🌐 Middleware Setup
app.use(cors({
  origin: 'https://prairiepin-auth.netlify.app',
  credentials: true
}));
app.use(express.json());

// 🔌 Route Mounting
app.use(authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use(lookupRoutes);
app.use(adminRoutes);

// 📍 Route: Convert LLD to Lat/Long
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
    console.log("📦 TownshipCanada response:");
    console.dir(data, { depth: null });

    const pointFeature = data.features?.find(f => f.geometry?.type === 'Point');

    if (!pointFeature) {
      return res.status(404).json({ error: 'No coordinates found!' });
    }

    const [longitude, latitude] = pointFeature.geometry.coordinates;

    // 🔐 Optionally log lookup if authenticated
    const authHeader = req.headers.authorization;
    console.log("🔐 Checking for authHeader in /convert:", authHeader);

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("🧪 Token verified for user:", decoded.userId);

        const insertResult = await pool.query(
          'INSERT INTO lookups (user_id, lld_entered, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id',
          [decoded.userId, lld, latitude, longitude]
        );

        console.log("✅ DB insert complete with ID:", insertResult.rows[0].id);
      } catch (err) {
        console.warn("🔐 Invalid or missing token; skipping log.");
        console.error(err);
      }
    } else {
      console.warn("❌ Missing or invalid Authorization header — skipping insert");
    }

    return res.json({ latitude, longitude });

  } catch (error) {
    console.error("🔥 Fetch failed:", error);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
});

// 🚦 Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});