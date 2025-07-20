const crypto = require('crypto');

// Single API key expected, or comma-separated list
const validKeys = (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);

if (validKeys.length === 0) {
  throw new Error('No API_KEYS configured');
}

module.exports = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  let authorized = false;
  validKeys.forEach(key => {
    const a = Buffer.from(apiKey);
    const b = Buffer.from(key);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      authorized = true;
    }
  });
  if (!authorized) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  // Attach placeholder user for downstream
  req.user = { apiKey }; 
  next();
};
