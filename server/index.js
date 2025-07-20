require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middlewares
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);
// CORS with whitelist
const whitelist = (process.env.CORS_WHITELIST || '').split(',');
app.use(cors({ origin: (origin, cb) => {
  if (!origin || whitelist.includes(origin)) return cb(null, true);
  cb(new Error('Not allowed by CORS'));}}));

// Authentication for all API routes
app.use('/api', auth);

// Routes
app.use('/api/github', require('./routes/github'));
app.use('/api/github-security-bot', require('./routes/github-security-bot'));
app.use('/api/vellum', require('./routes/vellum'));

// Error handler (last)
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
