const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); // ✅ correct // Adjust if your DB import differs


// ... Add /me and /me update routes here ...

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, city, province_state
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { first_name, last_name, email, city, province_state } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1,
           last_name = $2,
           email = $3,
           last_updated = NOW()
       WHERE id = $4
       RETURNING *`,
      [first_name, last_name, email, userId]
    );

    console.log('🔧 Profile updated for user ID:', userId);
    res.json({ message: 'Profile updated', user: result.rows[0] });

  } catch (err) {
    console.error('❌ Error updating profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const path = require('path'); // Make sure this is at the top if not already



module.exports = { router };