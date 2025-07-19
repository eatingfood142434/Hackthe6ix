/**
 * API Key validation middleware
 * Validates API key for protected routes
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Please provide x-api-key header or Authorization Bearer token.'
    });
  }

  // Check against environment variable
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    console.error('API_KEY not configured in environment variables');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  // Add API key info to request for logging
  req.apiKeyValid = true;
  next();
};

module.exports = validateApiKey;
