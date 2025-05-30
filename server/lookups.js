// server/lookups.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// GET /lookups – Get recent lookups for the logged-in user
router.get('/lookups', async (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query(
      `SELECT lld_entered, latitude, longitude, province, timestamp 
       FROM lookups 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 10`,
      [userId]
    );

    return res.render('user-profile', {
      user: userResult.rows[0],
      lookups: lookupsResult.rows
    });
    
  } catch (err) {
    console.error("Error verifying token or querying lookups:", err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;