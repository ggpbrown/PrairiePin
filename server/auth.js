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

// server/auth.js or server/me.js

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { firstName, isAdmin } = decoded;
    return res.json({ firstName, isAdmin });
  } catch (err) {
    console.error('JWT decode failed:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
});

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

    // ✅ Track login timestamp here (only if credentials matched)
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

	const token = jwt.sign(
	  { userId: user.id, email: user.email, firstName: user.first_name, isAdmin: user.is_admin },
	  JWT_SECRET,
	  { expiresIn: '8h' }
	);
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });
res.status(200).json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  const tokenFromCookie = req.cookies?.token;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ✅ Add this in auth.js
function isAdmin(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    console.log("🔐 Admin route hit with no token. Redirecting to login.");
    return res.redirect('/login.html');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      console.warn("🔐 Non-admin tried to access admin route.");
      return res.status(403).send('Forbidden');
    }

    req.user = decoded; // optional
    next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    return res.redirect('/login.html');
  }
}

// Logout route to clear the auth cookie and redirect
router.get('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'None'
  });
  res.redirect('/login.html');
});

module.exports = {
  router,
  authenticateToken,
  isAdmin
};
