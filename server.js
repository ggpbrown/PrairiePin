const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
// const authRoutes = require('./server/auth');
const { router: authRoutes } = require('./server/auth');
const dashboardRoutes = require('./server/dashboard');
const lookupRoutes = require('./server/lookups');

const app = express(); // ✅ First usage of `app`
app.use(lookupRoutes);

const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: 'https://prairiepin-auth.netlify.app',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(authRoutes);
app.use('/dashboard', dashboardRoutes);

app.use(cors(corsOptions));
app.use(express.json());       // For parsing JSON requests
app.use(authRoutes);          // ⬅️ Register /register and other auth routes here


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
    const pointFeature = data.features?.find((f) => f.geometry?.type === 'Point');

    if (!pointFeature) {
      return res.status(404).json({ error: 'No coordinates found!' });
    }

    const [longitude, latitude] = pointFeature.geometry.coordinates;

    // 🪵 Log to DB if authenticated
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await pool.query(
          'INSERT INTO lookups (user_id, lld_entered, latitude, longitude) VALUES ($1, $2, $3, $4)',
          [decoded.userId, lld, latitude, longitude]
        );
        console.log(`📌 Logged lookup for user ${decoded.userId}`);
      } catch (err) {
        console.warn("🔐 Token invalid or missing, skipping DB log");
      }
    }

    return res.json({ latitude, longitude });
  } catch (error) {
    console.error("Fetch failed:", error);
    return res.status(500).json({ error: 'Server error. Try again later.' });
  }
});
 // ✅ THIS is where the handler should end

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
