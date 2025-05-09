// server/lookups.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('./auth');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Protected route: fetch stats
router.get('/lookups', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(`
      SELECT id, user_id, lld, latitude, longitude, timestamp
      FROM lookup_logs
      WHERE user_id = $1
      ORDER BY lookup_time DESC
      LIMIT 10
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 Error in /lookups route\n", err);
    res.status(500).json({ error: 'Failed to fetch lookup history' });
  }
});


module.exports = router;
