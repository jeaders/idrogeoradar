import https from 'https';
import http from 'http';

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

function buildQueryString(event) {
  const params = new URLSearchParams();
  const multi = event.multiValueQueryStringParameters || {};
  const single = event.queryStringParameters || {};
  for (const key of Object.keys(single)) {
    const vals = multi[key] || [single[key]];
    for (const v of vals) params.append(key, v);
  }
  return params.toString();
}

function fetchWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      reject(new Error('Max redirects exceeded'));
      return;
    }

    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, (res) => {
      if (res.statusCode >= 301 && res.statusCode <= 303 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        res.resume();
        resolve(fetchWithRedirects(redirectUrl, maxRedirects - 1));
        return;
      }

      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || 'application/json';
        const isText = contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('xml');
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: isText ? bodyBuffer.toString('utf8') : bodyBuffer.toString('base64'),
          isBase64: !isText,
        });
      });
    });
    req.on('error', reject);
  });
}

export const handler = async (event, context) => {
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

  const qs = buildQueryString(event);
  const targetUrl = `${backend.origin}${rewrittenPath}${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetchWithRedirects(targetUrl);

    return {
      statusCode: res.statusCode || 200,
      headers: { ...corsHeaders, 'Content-Type': res.headers['content-type'] || 'application/json' },
      isBase64Encoded: res.isBase64,
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
