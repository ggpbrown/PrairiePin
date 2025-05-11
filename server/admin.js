// server/admin.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.get('/admin/stats', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const userResult = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS user_count,
        (SELECT COUNT(*) FROM lookups) AS lookup_count
    `);

    res.json(statsResult.rows[0]);

  } catch (err) {
    console.error("🔥 Admin stats error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;