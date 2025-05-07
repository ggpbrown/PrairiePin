const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const lld = event.queryStringParameters.lld;
  console.log(`🔎 Netlify function received LLD: ${lld}`);

  if (!lld) {
    console.warn('⚠️ Missing LLD parameter');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing LLD parameter' })
    };
  }

  const replitUrl = `https://dlstomapbackend-ggpbrown.replit.app/convert?lld=${encodeURIComponent(lld)}`;

  try {
    const response = await fetch(replitUrl);
    const data = await response.json();

    console.log(`✅ Replit responded with coordinates for ${lld}:`, data);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('❌ Proxy fetch error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Proxy error: ' + error.message })
    };
  }
};
