const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { lld } = event.queryStringParameters;

  if (!lld) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing LLD parameter' }),
    };
  }

  const apiKey = process.env.TOWNSHIP_API_KEY;
  const apiUrl = `https://api.townshipcanada.com/api/v1/search?query=${encodeURIComponent(lld)}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    const pointFeature = data.features.find(
      (f) => f.geometry.type === 'Point'
    );

    if (!pointFeature) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No coordinates found' }),
      };
    }

    const [longitude, latitude] = pointFeature.geometry.coordinates;

    return {
      statusCode: 200,
      body: JSON.stringify({ latitude, longitude }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error. Try again later.' }),
    };
  }
};
