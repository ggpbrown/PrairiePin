const express = require('express');
const router = express.Router(); // ✅ Ensures router is initialized
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { sendAccountUpdateEmail } = require('./utils/email');
const { authenticateToken, isAdmin } = require('./auth');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Get all users for displaying on admin dashboard main page
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
      return res.status(403).json({ error: 'Unauthorized3' });
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

// ✅ GET data to populate the Edit User form with existing user info
// 
router.get('/user/:id/edit', isAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    // Replace existing user query in GET /admin/user/:id/edit
// Replace existing user query in GET /admin/user/:id/edit
    const userResult = await pool.query(`
      SELECT id, first_name, last_name, email, address_line1, address_line2, city, province_state, postal_code, country, is_admin
      FROM users
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    res.render('edit-user', { user: userResult.rows[0] });

  } catch (err) {
    console.error('🔥 Error loading edit user page:', err);
    res.status(500).send('Server error');
  }
});

// ✅ POST /admin/user/:id/edit – handle admin updates
router.post('/user/:id/edit', isAdmin, async (req, res) => {
  const userId = req.params.id;
  const {
    first_name,
    last_name,
    email,
    address_line1,
    address_line2,
    city,
    province_state,
    postal_code,
    country,
    is_admin,
    password,
    confirm_password
  } = req.body;

  try {
    // ✅ Optional password validation
    if (password && password !== confirm_password) {
      return res.status(400).send('Passwords do not match.');
    }

    let updateFields = [
      first_name,
      last_name,
      email,
      address_line1,
      address_line2,
      city,
      province_state,
      postal_code,
      country,
      is_admin,
      userId
    ];

    let updateQuery = `
      UPDATE users SET
        first_name = $1,
        last_name = $2,
        email = $3,
        address_line1 = $4,
        address_line2 = $5,
        city = $6,
        province_state = $7,
        postal_code = $8,
        country = $9,
        is_admin = $10
      WHERE id = $11
    `;

    // ✅ If password was changed, hash and update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = `
        UPDATE users SET
          first_name = $1,
          last_name = $2,
          email = $3,
          address_line1 = $4,
          address_line2 = $5,
          city = $6,
          province_state = $7,
          postal_code = $8,
          country = $9,
          is_admin = $10,
          password_hash = $11
        WHERE id = $12
      `;
      updateFields.splice(10, 0, hashedPassword); // insert password before userId
    }

    await pool.query(updateQuery, updateFields);

    await sendAccountUpdateEmail(email, first_name);

    res.redirect(`/admin/user/${userId}`);
  } catch (err) {
    console.error('🔥 Error updating user:', err);
    res.status(500).send('Server error');
  }
});

// Get basic info for top of User Profile page and recent lookups
// 👤 GET /admin/user/:id
router.get('/user/:id', isAdmin, async (req, res) => {
  const userId = req.params.id;
  console.log(`🔍 Request to view user with ID: ${userId}`);

  try {
    const userResult = await pool.query(`
      SELECT id, first_name, last_name, email, last_login
      FROM users
      WHERE id = $1
    `, [userId]);

    console.log('👤 User lookup result:', userResult.rows);

    const lookupsResult = await pool.query(`
      SELECT lld_entered, latitude, longitude, province, timestamp
      FROM lookups
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 10
    `, [userId]);

    console.log('📜 Lookup records:', lookupsResult.rows);

    if (userResult.rows.length === 0) {
      console.warn('⚠️ No user found for ID:', userId);
      return res.status(404).send('User not found');
    }

    return res.render('user-profile', {
      user: userResult.rows[0],
      lookups: lookupsResult.rows
    });

  } catch (err) {
    console.error('🔥 Error loading user profile route:', err.message);
    console.error(err.stack);
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
      return res.status(403).json({ error: 'Unauthorized4' });
    }

    const userId = req.params.id;
    const { first_name, last_name, email, address_line1, address_line2, city, province_state, postal_code, country, is_admin, password } = req.body;

    await pool.query(`
      UPDATE users
      SET first_name = $1,
          last_name = $2,
          email = $3,
          address_line1 = $4,
          address_line2 = $5,
          city = $6,
          province_state = $7, 
          postal_code = $8,
          country = $9,
          is_admin = $10,
          password = COALESCE($11, password),
          last_updated = NOW()
      WHERE id = $12
    `, [
      first_name,
      last_name,
      email,
      address_line1,
      address_line2,
      city,
      postal_code,
      country,
      is_admin === 'on', // checkbox returns "on" if checked
      hashedPassword || null,
      userId
    ]);

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
      return res.status(403).json({ error: 'Unauthorized5' });
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

// ✅ GET /admin/organization/create – Render the New Organization form
router.get('/organization/create', isAdmin, (req, res) => {
  res.render('organization-create');
});

router.post('/organization/create', async (req, res) => {
  const { name, contact_name, contact_email, contact_phone, billing_address, isActive } = req.body;

  try {
    await pool.query(`
      INSERT INTO organizations (name, contact_name, contact_email, contact_phone, billing_address, isactive)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [name, contact_name, contact_email, contact_phone, billing_address, isActive ? true : false]);

    res.redirect('/admin');
  } catch (err) {
    console.error('❌ Error inserting organization:', err);
    res.status(500).send('Error creating organization.');
  }
});

module.exports = router;