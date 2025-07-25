require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const githubRoutes = require('./routes/github');
const githubSecurityRoutes = require('./routes/github-security-bot');
const healthRoutes = require('./routes/health');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const validateApiKey = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://patchy-ai.vercel.app',
    'https://patchy-theta.vercel.app',
    'https://patchy-bot.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Health check route (no auth required)
app.use('/health', healthRoutes);

// GitHub routes (no authentication required)
app.use('/api/github', githubRoutes);
app.use('/api/github-security', githubSecurityRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HackThe6ix Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      github: '/api/github'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Increase timeout for long-running Vellum workflows (10 minutes)
server.timeout = 600000; // 10 minutes in milliseconds
server.keepAliveTimeout = 610000; // Slightly longer than timeout
server.headersTimeout = 620000; // Slightly longer than keepAliveTimeout

console.log('⏱️  Server timeout set to 10 minutes for long-running AI workflows');
