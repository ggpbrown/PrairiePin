// server/dashboard.js

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware to validate JWT and extract user ID
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// GET /lookups - return total number of lookups for the logged-in user
router.get('/lookups', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM lookup_logs WHERE user_id = $1',
      [req.userId]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('Dashboard lookup error:', err);
    res.status(500).json({ error: 'Could not retrieve lookup data' });
  }
});

module.exports = router;
