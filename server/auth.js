// server/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
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
router.post('/register', async (req, res) => {
  const {
    email, password,
    first_name, last_name,
    address_line1, address_line2, city,
    province_state, postal_code, country
  } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

	const result = await pool.query(
	      `INSERT INTO users
	      (email, password_hash, first_name, last_name,
	      address_line1, address_line2, city, province_state, postal_code, country)
	      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	      RETURNING id`,
	      [email, hash, first_name, last_name, address_line1, address_line2, city, province_state, postal_code, country]
	    );
	    
     res.json({ success: true, userId: result.rows[0].id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }});

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
		{ userId: user.id, email: user.email, firstName: user.first_name },
			JWT_SECRET,
			{ expiresIn: '8h' }
			);	

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

module.exports = {
  router,
  authenticateToken
};
