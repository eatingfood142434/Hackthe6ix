const express = require('express');
const axios = require('axios');
const { check, validationResult } = require('express-validator');
const router = express.Router();

const VELLUM_API_KEY = process.env.VELLUM_API_KEY;
if (!VELLUM_API_KEY) throw new Error('Missing VELLUM_API_KEY');

const NAME_PATTERN = /^[A-Za-z0-9-_]+$/;

router.post('/analyze', [
  check('owner').matches(NAME_PATTERN),
  check('repo').matches(NAME_PATTERN),
  check('branch').optional().matches(/^[A-Za-z0-9_\-\/]+$/)
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { owner, repo, branch = 'main' } = req.body;
  try {
    const response = await axios.post(
      'https://api.vellum.ai/analyze',
      { owner, repo, branch },
      { headers: { Authorization: `Bearer ${VELLUM_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
