const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * GitHub API Integration
 * Base URL and configuration
 */
const GITHUB_BASE_URL = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Get repository information
 * GET /api/github/repo/:owner/:repo
 */
router.get('/repo/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    const githubResponse = await axios.get(
      `${GITHUB_BASE_URL}/repos/${owner}/${repo}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    res.json({
      success: true,
      data: githubResponse.data
    });

  } catch (error) {
    console.error('GitHub API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch repository information',
      message: error.message
    });
  }
});

/**
 * Get repository contents
 * GET /api/github/repo/:owner/:repo/contents/:path?
 */
router.get('/repo/:owner/:repo/contents/:path?', async (req, res) => {
  try {
    const { owner, repo, path } = req.params;
    const { ref } = req.query; // Optional branch/commit reference

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    let url = `${GITHUB_BASE_URL}/repos/${owner}/${repo}/contents`;
    if (path) {
      url += `/${path}`;
    }

    const params = {};
    if (ref) {
      params.ref = ref;
    }

    const githubResponse = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HackThe6ix-Backend'
      },
      params
    });

    res.json({
      success: true,
      data: githubResponse.data
    });

  } catch (error) {
    console.error('GitHub API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Path not found in repository'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch repository contents',
      message: error.message
    });
  }
});

/**
 * Create or update a file in repository
 * PUT /api/github/repo/:owner/:repo/contents/:path
 */
router.put('/repo/:owner/:repo/contents/:path', async (req, res) => {
  try {
    const { owner, repo, path } = req.params;
    const { message, content, sha, branch } = req.body;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    if (!message || !content) {
      return res.status(400).json({
        success: false,
        error: 'Commit message and content are required'
      });
    }

    const requestBody = {
      message,
      content: Buffer.from(content).toString('base64')
    };

    if (sha) {
      requestBody.sha = sha; // Required for updates
    }

    if (branch) {
      requestBody.branch = branch;
    }

    const githubResponse = await axios.put(
      `${GITHUB_BASE_URL}/repos/${owner}/${repo}/contents/${path}`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    res.json({
      success: true,
      data: githubResponse.data
    });

  } catch (error) {
    console.error('GitHub API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 409) {
      return res.status(409).json({
        success: false,
        error: 'File already exists or SHA mismatch. Provide the current SHA to update.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create/update file',
      message: error.message
    });
  }
});

/**
 * Get repository issues
 * GET /api/github/repo/:owner/:repo/issues
 */
router.get('/repo/:owner/:repo/issues', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state = 'open', labels, sort = 'created', direction = 'desc' } = req.query;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    const params = { state, sort, direction };
    if (labels) {
      params.labels = labels;
    }

    const githubResponse = await axios.get(
      `${GITHUB_BASE_URL}/repos/${owner}/${repo}/issues`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        },
        params
      }
    );

    res.json({
      success: true,
      data: githubResponse.data
    });

  } catch (error) {
    console.error('GitHub API Error:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues',
      message: error.message
    });
  }
});

/**
 * Create a new issue
 * POST /api/github/repo/:owner/:repo/issues
 */
router.post('/repo/:owner/:repo/issues', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { title, body, labels, assignees } = req.body;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Issue title is required'
      });
    }

    const requestBody = { title };
    if (body) requestBody.body = body;
    if (labels) requestBody.labels = labels;
    if (assignees) requestBody.assignees = assignees;

    const githubResponse = await axios.post(
      `${GITHUB_BASE_URL}/repos/${owner}/${repo}/issues`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    res.status(201).json({
      success: true,
      data: githubResponse.data
    });

  } catch (error) {
    console.error('GitHub API Error:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create issue',
      message: error.message
    });
  }
});

module.exports = router;
