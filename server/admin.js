const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { sendAccountUpdateEmail } = require('./utils/email');
require('dotenv').config();

const jwt = require('jsonwebtoken');

// 🚨 Updated Middleware for admin-only access (uses cookie)
const isAdmin = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send('Not authorized');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).send('Forbidden');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send('Invalid token');
  }
};


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Get all users for admin dashboard
router.get('/users', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!adminCheck.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const users = await pool.query(`
      SELECT id, first_name, last_name, email, last_login,
        (SELECT COUNT(*) FROM lookups WHERE lookups.user_id = users.id) AS lookup_count
      FROM users
      ORDER BY last_login DESC NULLS LAST
    `);

    res.json(users.rows);
  } catch (err) {
    console.error("🔥 Error fetching admin user list:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 👤 GET /admin/user/:id
router.get('/user/:id', isAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    const userResult = await pool.query(`
      SELECT id, first_name, last_name, email, created_at, last_login
      FROM users
      WHERE id = $1
    `, [userId]);

    const lookupsResult = await pool.query(`
      SELECT lld_entered, latitude, longitude, province, created_at
      FROM lookups
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    res.render('user-profile', {
      user: userResult.rows[0],
      lookups: lookupsResult.rows
    });

  } catch (err) {
    console.error('🔥 Error loading user profile:', err);
    res.status(500).send('Server error');
  }
});


// ✅ Update user + send email
router.post('/user/:id', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!adminCheck.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const userId = req.params.id;
    const { first_name, last_name, email, city, province_state, is_admin } = req.body;

    await pool.query(
      `UPDATE users SET
         first_name = $1,
         last_name = $2,
         email = $3,
         city = $4,
         province_state = $5,
         is_admin = $6
       WHERE id = $7`,
      [first_name, last_name, email, city, province_state, is_admin, userId]
    );

    await sendAccountUpdateEmail(email, first_name);

    res.json({ message: 'User updated successfully' });

  } catch (err) {
    console.error("🔥 Error updating user:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ View all lookups for a given user
router.get('/user/:id/lookups', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const adminCheck = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!adminCheck.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const userId = req.params.id;

    const result = await pool.query(
      `SELECT lld_entered, latitude, longitude, province, timestamp
       FROM lookups
       WHERE user_id = $1
       ORDER BY timestamp DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("🔥 Error fetching user lookups:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;