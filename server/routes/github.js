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
 * Fork a repository to your own GitHub account
 * POST /api/github/fork-repository
 * Body: { "url": "https://github.com/owner/repo" }
 */
router.post('/fork-repository', async (req, res) => {
  try {
    const { url } = req.body;

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

    // Parse GitHub URL
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

    // Fork the repository
    const forkResponse = await axios.post(
      `${GITHUB_BASE_URL}/repos/${owner}/${repo}/forks`,
      {},
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
      data: {
        fork: {
          name: forkResponse.data.name,
          fullName: forkResponse.data.full_name,
          url: forkResponse.data.html_url,
          cloneUrl: forkResponse.data.clone_url,
          owner: forkResponse.data.owner.login
        },
        original: {
          name: `${owner}/${repo}`,
          url: `https://github.com/${owner}/${repo}`
        }
      }
    });

  } catch (error) {
    console.error('GitHub Fork Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found'
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Repository may be private or you may not have permission to fork'
      });
    }

    if (error.response?.status === 422) {
      return res.status(422).json({
        success: false,
        error: 'Cannot fork repository. It may already be forked or other validation failed.',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fork repository',
      message: error.message
    });
  }
});

/**
 * Create a pull request with fork-first workflow
 * POST /api/github/create-fork-pull-request
 * Body: {
 *   "url": "https://github.com/owner/repo",
 *   "branch": "main", // base branch (optional, defaults to main)
 *   "newBranch": "feature/my-changes", // new branch name
 *   "title": "Pull Request Title",
 *   "description": "Detailed description of changes",
 *   "changedFiles": [
 *     {
 *       "path": "path/to/file.js",
 *       "content": "new file content here"
 *     }
 *   ]
 * }
 */
router.post('/create-fork-pull-request', async (req, res) => {
  try {
    const { 
      url, 
      branch = 'main', 
      newBranch, 
      title, 
      description, 
      changedFiles 
    } = req.body;

    // Validate required fields
    if (!url || !newBranch || !title || !changedFiles || !Array.isArray(changedFiles)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: url, newBranch, title, and changedFiles array'
      });
    }

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    // Parse GitHub URL
    let originalOwner, originalRepo;
    try {
      const parsed = parseGitHubUrl(url);
      originalOwner = parsed.owner;
      originalRepo = parsed.repo;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo'
      });
    }

    // Step 1: Get authenticated user info to know the fork owner
    const userResponse = await axios.get(
      `${GITHUB_BASE_URL}/user`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    const forkOwner = userResponse.data.login;

    // Step 2: Check if fork already exists, if not create it
    let forkExists = false;
    try {
      await axios.get(
        `${GITHUB_BASE_URL}/repos/${forkOwner}/${originalRepo}`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackThe6ix-Backend'
          }
        }
      );
      forkExists = true;
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    if (!forkExists) {
      // Fork the repository
      await axios.post(
        `${GITHUB_BASE_URL}/repos/${originalOwner}/${originalRepo}/forks`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackThe6ix-Backend'
          }
        }
      );

      // Wait a moment for the fork to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 3: Get the latest commit SHA from the base branch of the fork
    const branchResponse = await axios.get(
      `${GITHUB_BASE_URL}/repos/${forkOwner}/${originalRepo}/branches/${branch}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    const baseSha = branchResponse.data.commit.sha;

    // Step 4: Create a new branch in the fork
    await axios.post(
      `${GITHUB_BASE_URL}/repos/${forkOwner}/${originalRepo}/git/refs`,
      {
        ref: `refs/heads/${newBranch}`,
        sha: baseSha
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    // Step 5: Update files in the new branch of the fork
    const fileUpdatePromises = changedFiles.map(async (file) => {
      try {
        // Always get the latest file SHA from the new branch to avoid conflicts
        let currentSha = null;
        try {
          const currentFileResponse = await axios.get(
            `${GITHUB_BASE_URL}/repos/${forkOwner}/${originalRepo}/contents/${file.path}`,
            {
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'HackThe6ix-Backend'
              },
              params: { ref: newBranch }
            }
          );
          currentSha = currentFileResponse.data.sha;
        } catch (error) {
          // File doesn't exist in the new branch, try to get it from the base branch
          try {
            const baseFileResponse = await axios.get(
              `${GITHUB_BASE_URL}/repos/${forkOwner}/${originalRepo}/contents/${file.path}`,
              {
                headers: {
                  'Authorization': `Bearer ${GITHUB_TOKEN}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'HackThe6ix-Backend'
                },
                params: { ref: branch }
              }
            );
            currentSha = baseFileResponse.data.sha;
          } catch (baseError) {
            // File doesn't exist anywhere, that's okay for new files
          }
        }

        // Update or create the file
        const updateData = {
          message: `Update ${file.path}`,
          content: Buffer.from(file.content).toString('base64'),
          branch: newBranch
        };

        if (currentSha) {
          updateData.sha = currentSha;
        }

        return await axios.put(
          `${GITHUB_BASE_URL}/repos/${forkOwner}/${originalRepo}/contents/${file.path}`,
          updateData,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'HackThe6ix-Backend'
            }
          }
        );
      } catch (error) {
        console.error(`Error updating file ${file.path}:`, error.message);
        throw error;
      }
    });

    await Promise.all(fileUpdatePromises);

    // Step 6: Create the pull request from fork to original repository
    const prResponse = await axios.post(
      `${GITHUB_BASE_URL}/repos/${originalOwner}/${originalRepo}/pulls`,
      {
        title: title,
        body: description,
        head: `${forkOwner}:${newBranch}`, // fork:branch format
        base: branch
      },
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
      data: {
        pullRequest: {
          number: prResponse.data.number,
          title: prResponse.data.title,
          url: prResponse.data.html_url,
          state: prResponse.data.state
        },
        fork: {
          owner: forkOwner,
          name: originalRepo,
          url: `https://github.com/${forkOwner}/${originalRepo}`
        },
        original: {
          owner: originalOwner,
          name: originalRepo,
          url: `https://github.com/${originalOwner}/${originalRepo}`
        },
        branch: newBranch,
        filesChanged: changedFiles.length
      }
    });

  } catch (error) {
    console.error('GitHub Fork PR Creation Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Repository not found or insufficient permissions'
      });
    }

    if (error.response?.status === 409) {
      return res.status(409).json({
        success: false,
        error: 'Pull request already exists or there is a conflict',
        details: error.response.data
      });
    }

    if (error.response?.status === 422) {
      return res.status(422).json({
        success: false,
        error: 'Validation failed. Branch may already exist or invalid data provided.',
        details: error.response.data
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Check your GitHub token permissions'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create fork pull request',
      message: error.message
    });
  }
});

module.exports = router;
