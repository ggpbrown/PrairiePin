const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const lld = event.queryStringParameters.lld;

  if (!lld) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing LLD parameter' })
    };
  }

  const replitUrl = `https://dlstomapbackend-ggpbrown.replit.app/convert?lld=${encodeURIComponent(lld)}`;

  try {
    const response = await fetch(replitUrl);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Proxy error: ' + error.message })
    };
  }
};

