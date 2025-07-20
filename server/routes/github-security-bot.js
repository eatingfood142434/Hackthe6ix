const express = require('express');
const axios = require('axios');
const { check, validationResult } = require('express-validator');
const router = express.Router();

// Bot token stored securely in env
const BOT_TOKEN = process.env.GITHUB_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('Missing GITHUB_BOT_TOKEN');

async function botRequest(method, url, data) {
  return axios({
    method,
    url: `https://api.github.com${url}`,
    headers: {
      Authorization: `token ${BOT_TOKEN}`,
      'User-Agent': 'Security-Bot'
    },
    data
  });
}

// Validate inputs
const NAME_PATTERN = /^[A-Za-z0-9-_]+$/;
const REF_PATTERN = /^[A-Za-z0-9_\-\/]+$/;
const PATH_PATTERN = /^[A-Za-z0-9_\-\/\.]+$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;

router.post('/create-issue', [
  check('owner').matches(NAME_PATTERN),
  check('repo').matches(NAME_PATTERN),
  check('title').isLength({ min: 1, max: 256 }).trim().escape(),
  check('body').optional().isString().trim().escape()
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { owner, repo, title, body } = req.body;
  try {
    const resp = await botRequest('post', `/repos/${owner}/${repo}/issues`, { title, body });
    res.json(resp.data);
  } catch (err) {
    next(err);
  }
});

router.post('/auto-fix', [
  check('owner').matches(NAME_PATTERN),
  check('repo').matches(NAME_PATTERN),
  check('branch').matches(REF_PATTERN),
  check('filePath').matches(PATH_PATTERN),
  check('patch').isString(),
  check('issueNumber').isInt({ min: 1 })
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { owner, repo, branch, filePath, patch, issueNumber } = req.body;
  try {
    // Retrieve file to patch
    const fileResp = await botRequest('get', `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`);
    const sha = fileResp.data.sha;
    const content = Buffer.from(
      applyPatch(Buffer.from(fileResp.data.content, 'base64').toString('utf8'), patch),
      'utf8'
    ).toString('base64');
    // Update file
    const updateResp = await botRequest('put', `/repos/${owner}/${repo}/contents/${filePath}`, {
      message: `fix(issue#${issueNumber}) apply security patch`,
      content,
      sha,
      branch
    });
    // Comment on issue
    await botRequest('post', `/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      body: 'Automated security fix applied.'
    });
    res.json(updateResp.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
