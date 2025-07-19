const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * GitHub API Integration - Simplified to read all file contents
 */
const GITHUB_BASE_URL = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Helper function to parse GitHub URL and extract owner/repo
 */
function parseGitHubUrl(url) {
  const regex = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid GitHub URL format');
  }
  
  let repo = match[2];
  // Remove .git suffix if present
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }
  
  return {
    owner: match[1],
    repo: repo
  };
}

/**
 * Recursively fetch all file contents from a directory
 */
async function getAllFileContents(owner, repo, path = '', branch = 'main') {
  const files = [];
  
  try {
    let url = `${GITHUB_BASE_URL}/repos/${owner}/${repo}/contents`;
    if (path) {
      url += `/${path}`;
    }

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HackThe6ix-Backend'
      },
      params: { ref: branch }
    });

    const items = Array.isArray(response.data) ? response.data : [response.data];

    for (const item of items) {
      if (item.type === 'file') {
        // Fetch file content
        const fileResponse = await axios.get(item.url, {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackThe6ix-Backend'
          }
        });

        files.push({
          path: item.path,
          name: item.name,
          size: item.size,
          content: Buffer.from(fileResponse.data.content, 'base64').toString('utf-8'),
          sha: item.sha,
          url: item.html_url
        });
      } else if (item.type === 'dir') {
        // Recursively fetch directory contents
        const subFiles = await getAllFileContents(owner, repo, item.path, branch);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error(`Error fetching contents for path ${path}:`, error.message);
    // Continue with other files even if one fails
  }

  return files;
}

/**
 * Read all file contents from a GitHub repository
 * POST /api/github/read-all-files
 * Body: { "url": "https://github.com/owner/repo", "branch": "main" (optional) }
 */
router.post('/read-all-files', async (req, res) => {
  try {
    const { url, branch = 'main' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'GitHub repository URL is required'
      });
    }

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    // Parse GitHub URL to extract owner and repo
    let owner, repo;
    try {
      const parsed = parseGitHubUrl(url);
      owner = parsed.owner;
      repo = parsed.repo;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo'
      });
    }

    // Fetch all file contents
    const files = await getAllFileContents(owner, repo, '', branch);

    res.json({
      success: true,
      data: {
        repository: `${owner}/${repo}`,
        branch: branch,
        totalFiles: files.length,
        files: files
      }
    });

  } catch (error) {
    console.error('GitHub API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found or branch does not exist'
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Repository may be private or rate limit exceeded'
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
 * Analyze GitHub repository for security issues
 * POST /api/github/analyze
 * Body: { "repoUrl": "https://github.com/owner/repo" }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'GitHub repository URL is required'
      });
    }

    // Step 1: Fetch all files from GitHub
    const filesResponse = await getAllFileContents(
      ...Object.values(parseGitHubUrl(repoUrl))
    );

    // Step 2: Filter relevant files for security analysis
    const relevantFiles = filesResponse.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['js', 'ts', 'py', 'java', 'php', 'go', 'rb', 'cs', 'cpp', 'c'].includes(ext);
    });

    // Step 3: Prepare content for Vellum AI analysis
    const codeContent = relevantFiles.map(file => ({
      filename: file.path,
      content: file.content
    }));

    // Step 4: Call Vellum AI for security analysis (placeholder for now)
    // TODO: Integrate with your existing Vellum workflow
    const mockSecurityIssues = [
      {
        type: 'SQL Injection',
        severity: 'high',
        description: 'Potential SQL injection vulnerability detected',
        file: 'src/database.js',
        line: 42,
        recommendation: 'Use parameterized queries instead of string concatenation'
      },
      {
        type: 'XSS Vulnerability',
        severity: 'medium',
        description: 'User input not properly sanitized',
        file: 'src/routes/user.js',
        line: 18,
        recommendation: 'Implement input validation and output encoding'
      }
    ];

    // Step 5: Calculate summary
    const summary = {
      total: mockSecurityIssues.length,
      critical: mockSecurityIssues.filter(i => i.severity === 'critical').length,
      high: mockSecurityIssues.filter(i => i.severity === 'high').length,
      medium: mockSecurityIssues.filter(i => i.severity === 'medium').length,
      low: mockSecurityIssues.filter(i => i.severity === 'low').length
    };

    res.json({
      status: 'success',
      issues: mockSecurityIssues,
      summary,
      repository: repoUrl,
      filesAnalyzed: relevantFiles.length
    });

  } catch (error) {
    console.error('Analysis Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze repository',
      error: error.message
    });
  }
});

module.exports = router;
