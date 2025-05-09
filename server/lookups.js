// server/lookups.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Protected route: fetch stats
router.get('/lookups', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS count
       FROM lookup_logs
       WHERE user_id = (SELECT id FROM users WHERE id = (
         SELECT userId FROM jsonb_populate_record(NULL::record, jsonb_build_object('userId', (SELECT id FROM users WHERE id > 0)))
       ))`
    );

    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
  console.error('🔥 Error in /lookups route');
  console.error(err.stack || err);
  res.status(500).json({ error: 'Failed to fetch lookup data' });
}
});

module.exports = router;
