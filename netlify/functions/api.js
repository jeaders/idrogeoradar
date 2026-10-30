const https = require('https');
const http = require('http');

const BACKENDS = {
  '/api/geoserver/': { origin: 'https://idrogeo.isprambiente.it', rewrite: '/geoserver/' },
  '/api/idrogeo/': { origin: 'https://idrogeo.isprambiente.it', rewrite: '/api/' },
  '/api/meteoalarm/': { origin: 'https://feeds.meteoalarm.org', rewrite: '/' },
  '/api/open-meteo/': { origin: 'https://api.open-meteo.com', rewrite: '/' },
  '/api/photon/': { origin: 'https://photon.komoot.io', rewrite: '/' },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function fetchWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      reject(new Error('Max redirects exceeded'));
      return;
    }

    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, (res) => {
      // Handle redirect
      if (res.statusCode >= 301 && res.statusCode <= 303 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        res.resume();
        resolve(fetchWithRedirects(redirectUrl, maxRedirects - 1));
        return;
      }

      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });
    req.on('error', reject);
  });
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const path = event.path || '';
  let backend = null;
  let rewrittenPath = path;

  for (const [prefix, config] of Object.entries(BACKENDS)) {
    if (path.startsWith(prefix)) {
      backend = config;
      rewrittenPath = config.rewrite + path.slice(prefix.length);
      break;
    }
  }

  if (!backend) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Backend non riconosciuto' }),
    };
  }

  const queryString = new URLSearchParams(event.queryStringParameters || {});
  const qs = queryString.toString();
  const targetUrl = `${backend.origin}${rewrittenPath}${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetchWithRedirects(targetUrl);

    return {
      statusCode: res.statusCode || 200,
      headers: { ...corsHeaders, 'Content-Type': res.headers['content-type'] || 'application/json' },
      isBase64Encoded: false,
      body: res.body,
    };
  } catch (error) {
    console.error('Proxy error:', error.message);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Proxy error' }),
    };
  }
};