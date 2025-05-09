// server/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';



// (Optional) Register route
rrouter.post('/register', async (req, res) => {
  const {
    email, password,
    address_line1, address_line2, city,
    province_state, postal_code, country
  } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
      (email, password_hash, address_line1, address_line2, city, province_state, postal_code, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [email, hash, address_line1, address_line2, city, province_state, postal_code, country]
    );

    res.json({ success: true, userId: result.rows[0].id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});


module.exports = router;
