const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = error;
    res.status(503).json(healthCheck);
  }
});

/**
 * Detailed health check with dependencies
 * GET /health/detailed
 */
router.get('/detailed', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      vellum: {
        status: process.env.VELLUM_API_KEY ? 'configured' : 'not configured',
        endpoint: process.env.VELLUM_API_URL || 'not set'
      },
      github: {
        status: process.env.GITHUB_TOKEN ? 'configured' : 'not configured',
        endpoint: 'https://api.github.com'
      }
    }
  };

  res.status(200).json(healthCheck);
});

module.exports = router;
