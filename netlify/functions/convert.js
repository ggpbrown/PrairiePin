// /netlify/functions/convert.js
const { Client } = require('pg');
const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const lld = new URLSearchParams(event.rawQuery).get('lld');
    if (!lld) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing lld' }) };
    }

    const REPLIT_CONVERTER_URL = process.env.REPLIT_CONVERTER_URL;
    const DATABASE_URL = process.env.DATABASE_URL;
    const SOURCE_TAG = process.env.SOURCE_TAG || 'lite';

    // 1) Call your existing Replit converter (unchanged UX)
    const up = new URL(REPLIT_CONVERTER_URL);
    up.searchParams.set('lld', lld);

    const convRes = await fetch(up.toString());
    if (!convRes.ok) {
      return { statusCode: convRes.status, body: JSON.stringify({ error: 'Converter error' }) };
    }
    const { latitude, longitude, error } = await convRes.json();
    if (error || latitude == null || longitude == null) {
      return { statusCode: 404, body: JSON.stringify({ error: error || 'No coordinates found' }) };
    }

    // 2) Log to Railway (best-effort — don’t fail the user if logging fails)
    try {
      const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();
      await client.query(
        `INSERT INTO lookups (lld_entered, latitude, longitude, province, source)
         VALUES ($1, $2, $3, NULL, $4)`,
        [lld, latitude, longitude, SOURCE_TAG]
      );
      await client.end();
    } catch (e) {
      console.warn('Logging failed (non-fatal):', e.message);
    }

    // 3) Return to browser
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};