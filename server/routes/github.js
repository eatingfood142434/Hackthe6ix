const express = require('express');
const axios = require('axios');
const router = express.Router();
const { check, validationResult } = require('express-validator');

// Role-based access: assume auth middleware attaches req.user with { token, role }
router.use((req, res, next) => {
  if (!req.user || !req.user.token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Helper: validate owner/repo/branch names with regex
const NAME_PATTERN = /^[A-Za-z0-9-_]+$/;
const REF_PATTERN = /^[A-Za-z0-9_\-\/]+$/;
const PATH_PATTERN = /^[A-Za-z0-9_\-\/\.]+$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;

async function githubRequest(req, method, url, data) {
  return axios({
    method,
    url: `https://api.github.com${url}`,
    headers: {
      Authorization: `token ${req.user.token}`,
      'User-Agent': 'Secure-App'
    },
    data
  });
}

// Fork a repository
router.post('/fork', [
  check('owner').matches(NAME_PATTERN),
  check('repo').matches(NAME_PATTERN)
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { owner, repo } = req.body;
  try {
    const resp = await githubRequest(req, 'post', `/repos/${owner}/${repo}/forks`);
    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

// Create a branch in a fork
router.post('/branch', [
  check('owner').matches(NAME_PATTERN),
  check('repo').matches(NAME_PATTERN),
  check('newBranch').matches(REF_PATTERN),
  check('fromSha').matches(SHA_PATTERN)
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { owner, repo, newBranch, fromSha } = req.body;
  try {
    const refData = { ref: `refs/heads/${newBranch}`, sha: fromSha };
    const resp = await githubRequest(req, 'post', `/repos/${owner}/${repo}/git/refs`, refData);
    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

// Update or create file
router.put('/file', [
  check('owner').matches(NAME_PATTERN),
  check('repo').matches(NAME_PATTERN),
  check('branch').matches(REF_PATTERN),
  check('filePath').matches(PATH_PATTERN),
  check('content').isString(),
  check('message').isString()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { owner, repo, branch, filePath, content, message } = req.body;
  try {
    // Get file SHA if exists
    let sha;
    try {
      const getResp = await githubRequest(req, 'get', `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`);
      sha = getResp.data.sha;
    } catch (e) {
      if (e.response && e.response.status !== 404) throw e;
    }
    const body = {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch
    };
    if (sha) body.sha = sha;
    const resp = await githubRequest(req, 'put', `/repos/${owner}/${repo}/contents/${filePath}`, body);
    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

// Create a pull request
router.post('/pull-request', [
  check('owner').matches(NAME_PATTERN),
  check('repo').matches(NAME_PATTERN),
  check('title').isLength({ min: 1, max: 256 }).trim().escape(),
  check('head').matches(REF_PATTERN),
  check('base').matches(REF_PATTERN),
  check('body').optional().isString().trim().escape()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { owner, repo, title, head, base, body } = req.body;
  try {
    const prData = { title, head, base };
    if (body) prData.body = body;
    const resp = await githubRequest(req, 'post', `/repos/${owner}/${repo}/pulls`, prData);
    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
