const express = require('express');
const axios = require('axios');
const router = express.Router();
const NodeCache = require('node-cache');
const {executeVellumWorkflow} = require('./vellum');

/**
 * GitHub API Integration - Simplified to read all file contents
 */
const GITHUB_BASE_URL = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Create a cache with TTL of 1 hour (3600 seconds)
const repoCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
const prStatusCache = new NodeCache({ stdTTL: 600, checkperiod: 60 }); // 10 minutes TTL for PR status

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
  // Expanded list of relevant extensions for modern web development
  const relevantExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',  // Frontend frameworks
    'py', 'java', 'php', 'go', 'rb', 'cs', 'cpp', 'c', 'rs',  // Backend languages
    'sql', 'graphql', 'json', 'yaml', 'yml', 'toml',  // Config/data files
    'sh', 'bash', 'ps1', 'dockerfile'  // Scripts and deployment
  ];
  
  // Only skip the most problematic directories (be more selective)
  const skipDirectories = [
    '.next', 'node_modules', 'dist', 'build', '.git',  // Essential skips
    'vendor', '__pycache__', '.cache'  // Language-specific build artifacts
  ];
  
  const skipFilePatterns = [
    /\.hot-update\./,  // Webpack hot reload files
    /\.map$/,         // Source maps
    /\.min\./,        // Minified files
    /\.bundle\./,     // Bundle files
    /\.chunk\./,      // Chunk files
    /package-lock\.json$/,
    /yarn\.lock$/,
    /\.log$/
  ];
  
  // Directories and files to skip (build artifacts, dependencies, etc.)
  const skipDirectories = [
    '.next', 'node_modules', 'dist', 'build', '.git', '.vscode', '.idea',
    'vendor', 'target', '__pycache__', '.pytest_cache', 'coverage',
    '.nyc_output', 'logs', 'tmp', 'temp', '.cache', '.parcel-cache'
  ];
  
  const skipFilePatterns = [
    /\.hot-update\./,  // Webpack hot reload files
    /\.map$/,         // Source maps
    /\.min\./,        // Minified files
    /\.bundle\./,     // Bundle files
    /\.chunk\./,      // Chunk files
    /package-lock\.json$/,
    /yarn\.lock$/,
    /\.log$/
  ];
  
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
    
    // Process all items in parallel instead of sequentially
    const itemPromises = items.map(async (item) => {
      // Skip directories that are build artifacts or dependencies
      if (item.type === 'dir') {
        const dirName = item.name.toLowerCase();
        if (skipDirectories.includes(dirName)) {
          console.log(`Skipping directory: ${item.path}`);
          return [];
        }
      }
      
      if (item.type === 'file') {
        // Skip files that match skip patterns
        const fileName = item.name.toLowerCase();
        if (skipFilePatterns.some(pattern => pattern.test(fileName))) {
          console.log(`Skipping file: ${item.path}`);
          return null;
        }
        
        // Check if file is relevant for security analysis before fetching content
        const ext = item.name.split('.').pop()?.toLowerCase();
        
        if (!relevantExtensions.includes(ext)) {
          // Skip content fetching for non-relevant files
          return {
            path: item.path,
            name: item.name,
            size: item.size,
            content: '', // Skip content for non-relevant files
            sha: item.sha,
            url: item.html_url
          };
        }
        
        // Fetch file content only for relevant files
        try {
          const fileResponse = await axios.get(item.url, {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'HackThe6ix-Backend'
            }
          });

          return {
            path: item.path,
            name: item.name,
            size: item.size,
            content: Buffer.from(fileResponse.data.content, 'base64').toString('utf-8'),
            sha: item.sha,
            url: item.html_url
          };
        } catch (fileError) {
          console.error(`Error fetching file ${item.path}:`, fileError.message);
          return {
            path: item.path,
            name: item.name,
            size: item.size,
            content: '', // Return empty content on error
            sha: item.sha,
            url: item.html_url
          };
        }
      } else if (item.type === 'dir') {
        // Recursively fetch directory contents
        return getAllFileContents(owner, repo, item.path, branch);
      }
      return [];
    });
    
    // Wait for all promises to resolve
    const results = await Promise.all(itemPromises);
    
    // Flatten the results array and add to files
    results.forEach(result => {
      if (Array.isArray(result)) {
        files.push(...result);
      } else if (result) {
        files.push(result);
      }
    });
  } catch (error) {
    console.error(`Error fetching contents for path ${path}:`, error.message);
    // Continue with other files even if one fails
  }

  return files;
}

/**
 * Process Vellum AI results into structured analysis data
 */
async function processVellumResults(vellumResult, owner, repo) {
  const scannedFiles = vellumResult.find(output => output.name === 'scanned-files')?.value || {};
  const fixes = vellumResult.find(output => output.name === 'results')?.value || {};
  
  const summary = {
    repository: `${owner}/${repo}`,
    analysis_date: new Date().toISOString(),
    total_files_scanned: scannedFiles.classification_summary?.total_files || 0,
    total_fixes: fixes.fix_summary?.total_fixes || 0,
    high_risk_files: scannedFiles.high_risk_files?.length || 0,
    medium_risk_files: scannedFiles.medium_risk_files?.length || 0,
    low_risk_files: scannedFiles.low_risk_files?.length || 0,
    estimated_fix_time: fixes.fix_summary?.estimated_fix_time || 'Unknown'
  };
  
  return {
    summary,
    vulnerabilities: {
      high_risk: scannedFiles.high_risk_files || [],
      medium_risk: scannedFiles.medium_risk_files || [],
      low_risk: scannedFiles.low_risk_files || []
    },
    fixes: fixes.fixes || [],
    implementation_guide: fixes.implementation_guide || {}
  };
}

/**
 * Create a comprehensive security report in markdown format
 */
function generateSecurityReport(analysisResult) {
  const { summary, vulnerabilities, fixes, implementation_guide } = analysisResult;
  
  return `# 🔒 Comprehensive Security Analysis Report

## 🛡️ Executive Summary
This security report was generated by **Patchy** - an AI-powered automated security vulnerability detection and fixing tool.

- **Repository:** ${summary.repository}
- **Analysis Date:** ${summary.analysis_date}
- **Files Scanned:** ${summary.total_files_scanned}
- **Security Fixes Available:** ${summary.total_fixes}
- **Estimated Fix Time:** ${summary.estimated_fix_time}

## 🚨 Vulnerability Summary

### High Risk Files (${summary.high_risk_files})
${vulnerabilities.high_risk.map((file, index) => `
#### ${index + 1}. ${file.name} (${file.language})
- **Path:** \`${file.path}\`
- **Type:** ${file.file_type}
- **Risk:** ${file.risk_reason}
`).join('')}

### Medium Risk Files (${summary.medium_risk_files})
${vulnerabilities.medium_risk.map((file, index) => `
#### ${index + 1}. ${file.name} (${file.language})
- **Path:** \`${file.path}\`
- **Type:** ${file.file_type}
- **Risk:** ${file.risk_reason}
`).join('')}

### Low Risk Files (${summary.low_risk_files})
${vulnerabilities.low_risk.map((file, index) => `
#### ${index + 1}. ${file.name} (${file.language})
- **Path:** \`${file.path}\`
- **Risk:** ${file.risk_reason}
`).join('')}

## 🔧 Security Fixes Provided

${fixes.map((fix, index) => `
### ${index + 1}. ${fix.file_path}
**Vulnerability:** ${fix.vulnerability_type}  
**Confidence:** ${fix.fix_confidence}  
**Breaking Changes:** ${fix.breaking_changes ? 'Yes' : 'No'}

**Explanation:** ${fix.explanation}

**Security Notes:** ${fix.security_notes}

**Additional Dependencies:**
${fix.additional_imports?.map(dep => `- ${dep}`).join('\n') || 'None'}

**Testing Recommendations:**
${fix.testing_recommendations?.map(test => `- ${test}`).join('\n') || 'None'}

---
`).join('')}

## 📋 Implementation Guide

### Prerequisites
${implementation_guide.prerequisites?.map(req => `- ${req}`).join('\n') || 'None specified'}

### Deployment Steps
${implementation_guide.deployment_steps?.map(step => `
${step.step}. **${step.action}**
   - Command: \`${step.command}\`
   - Verification: ${step.verification}
`).join('') || 'No specific steps provided'}

### Monitoring Recommendations
${implementation_guide.monitoring_recommendations?.map(rec => `- ${rec}`).join('\n') || 'None specified'}

## 🚀 Next Steps

1. **Review each security issue carefully** - Understand the vulnerability and proposed fix
2. **Test the fixes in a development environment** - Ensure functionality is preserved
3. **Apply fixes in priority order** - Start with high-confidence, high-impact fixes
4. **Update dependencies** - Install any additional required packages
5. **Run security tests** - Verify vulnerabilities are resolved
6. **Deploy to production** - Follow your standard deployment process
7. **Monitor for issues** - Watch logs and metrics after deployment

## 📊 Risk Assessment

| Risk Level | Count | Priority |
|------------|-------|----------|
| High       | ${summary.high_risk_files} | 🔴 Immediate |
| Medium     | ${summary.medium_risk_files} | 🟡 Soon |
| Low        | ${summary.low_risk_files} | 🟢 When convenient |

---

*🤖 This report was automatically generated by Patchy - AI-Powered Security Analysis*  
*Keeping your code secure, one repository at a time! 🛡️*

**Need help?** Contact our security team or review the implementation guide above.
`;
}

/**
 * Create a pull request with security fixes and comprehensive report
 */
async function createSecurityPullRequest(owner, repo, analysisResult) {
  console.log(`Creating automated security fix PR for ${owner}/${repo}`);
  
  // Fork the repository
  const forkResponse = await axios.post(
    `https://api.github.com/repos/${owner}/${repo}/forks`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Patchy-Security-Bot'
      }
    }
  );

  const forkOwner = forkResponse.data.owner.login;
  const forkName = forkResponse.data.name;

  // Wait for fork to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Get default branch
  const repoInfoResponse = await axios.get(
    `https://api.github.com/repos/${forkOwner}/${forkName}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Patchy-Security-Bot'
      }
    }
  );

  const defaultBranch = repoInfoResponse.data.default_branch;

  // Create new branch for security fixes
  const newBranchName = `patchy-security-fixes-${Date.now()}`;
  
  const branchResponse = await axios.get(
    `https://api.github.com/repos/${forkOwner}/${forkName}/git/refs/heads/${defaultBranch}`,
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Patchy-Security-Bot'
      }
    }
  );

  const baseSha = branchResponse.data.object.sha;

  await axios.post(
    `https://api.github.com/repos/${forkOwner}/${forkName}/git/refs`,
    {
      ref: `refs/heads/${newBranchName}`,
      sha: baseSha
    },
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Patchy-Security-Bot'
      }
    }
  );

  // Generate comprehensive security report
  const securityReportContent = generateSecurityReport(analysisResult);

  // Commit the security report
  await axios.put(
    `https://api.github.com/repos/${forkOwner}/${forkName}/contents/PATCHY_SECURITY_REPORT.md`,
    {
      message: '🔒 Add comprehensive AI-generated security analysis report',
      content: Buffer.from(securityReportContent).toString('base64'),
      branch: newBranchName
    },
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Patchy-Security-Bot'
      }
    }
  );

  // Apply fixes directly to the original files to show proper diffs
  const appliedFixes = [];
  
  for (const [index, fix] of analysisResult.fixes.entries()) {
    try {
      // Get the current file content from the fork
      const currentFileResponse = await axios.get(
        `https://api.github.com/repos/${forkOwner}/${forkName}/contents/${fix.file_path}`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Patchy-Security-Bot'
          },
          params: { ref: newBranchName }
        }
      );

      // Update the file with the fixed code
      await axios.put(
        `https://api.github.com/repos/${forkOwner}/${forkName}/contents/${fix.file_path}`,
        {
          message: `🔒 Fix ${fix.vulnerability_type} vulnerability in ${fix.file_path}\n\n- ${fix.explanation}\n- Confidence: ${fix.fix_confidence}\n- Breaking changes: ${fix.breaking_changes ? 'Yes' : 'No'}`,
          content: Buffer.from(fix.fixed_code).toString('base64'),
          sha: currentFileResponse.data.sha,
          branch: newBranchName
        },
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Patchy-Security-Bot'
          }
        }
      );

      appliedFixes.push({
        file: fix.file_path,
        vulnerability: fix.vulnerability_type,
        confidence: fix.fix_confidence,
        breaking_changes: fix.breaking_changes
      });

      console.log(`✅ Applied fix ${index + 1}/${analysisResult.fixes.length}: ${fix.file_path}`);
    } catch (fileError) {
      console.error(`❌ Failed to apply fix to ${fix.file_path}:`, fileError.message);
      // Continue with other fixes even if one fails
    }
  }

  // Create a single summary file with fix details for reference
  const fixSummaryContent = `# 🔒 Patchy Security Fixes Applied

## Summary
- **Total Fixes Applied:** ${appliedFixes.length}/${analysisResult.fixes.length}
- **Analysis Date:** ${analysisResult.summary.analysis_date}
- **Repository:** ${analysisResult.summary.repository}

## Applied Fixes

${appliedFixes.map((fix, index) => `### ${index + 1}. ${fix.file}
- **Vulnerability:** ${fix.vulnerability}
- **Confidence:** ${fix.confidence}
- **Breaking Changes:** ${fix.breaking_changes ? 'Yes' : 'No'}
`).join('\n')}

## Implementation Notes

${analysisResult.fixes.map(fix => `### ${fix.file_path}
**Issue:** ${fix.explanation}

**Security Notes:** ${fix.security_notes}

**Additional Dependencies:**
${fix.additional_imports?.map(dep => `- ${dep}`).join('\n') || 'None'}

**Testing Recommendations:**
${fix.testing_recommendations?.map(test => `- ${test}`).join('\n') || 'None'}

---
`).join('\n')}

*🤖 This file was automatically generated by Patchy - AI Security Analysis Tool*
`;

  // Create the fix summary file
  await axios.put(
    `https://api.github.com/repos/${forkOwner}/${forkName}/contents/PATCHY_SECURITY_FIXES.md`,
    {
      message: '📋 Add security fixes summary and implementation notes',
      content: Buffer.from(fixSummaryContent).toString('base64'),
      branch: newBranchName
    },
    {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Patchy-Security-Bot'
      }
    }
  );

  // Create pull request with comprehensive description
  const prBody = `## 🔒 AI-Powered Security Analysis by Patchy

### 🛡️ Security Summary
**${analysisResult.summary.total_fixes} critical security vulnerabilities detected and fixed!**

- **High Risk Files:** ${analysisResult.summary.high_risk_files}
- **Medium Risk Files:** ${analysisResult.summary.medium_risk_files}  
- **Low Risk Files:** ${analysisResult.summary.low_risk_files}
- **Estimated Fix Time:** ${analysisResult.summary.estimated_fix_time}

### 🚨 Critical Vulnerabilities Found
${analysisResult.vulnerabilities.high_risk.map((file, index) => `
${index + 1}. **${file.name}** - ${file.risk_reason.substring(0, 100)}...
`).join('')}

### 📄 What's Included in This PR

- **PATCHY_SECURITY_REPORT.md**: Complete security analysis with all findings
- **Individual Fix Files**: Detailed fixes for each vulnerability with:
  - ✅ Ready-to-use secure code replacements
  - 🧪 Testing recommendations  
  - 📚 Security explanations
  - 🔄 Alternative implementation approaches

### 🔧 Fixes Provided
${analysisResult.fixes.map((fix, index) => `
${index + 1}. **${fix.file_path}** - ${fix.vulnerability_type}
   - Confidence: ${fix.fix_confidence}
   - Breaking Changes: ${fix.breaking_changes ? 'Yes' : 'No'}
`).join('')}

### 🚀 Implementation Steps

1. **Review the comprehensive report** in \`PATCHY_SECURITY_REPORT.md\`
2. **Examine individual fixes** in the \`PATCHY_FIX_*\` files
3. **Apply fixes in priority order** (high-confidence fixes first)
4. **Install additional dependencies** as specified in each fix
5. **Run the provided test cases** to verify fixes work correctly
6. **Deploy with confidence** knowing your security vulnerabilities are resolved

### 🧪 Testing
Each fix includes specific test cases to verify:
- ✅ Vulnerabilities are closed
- ✅ Functionality is preserved  
- ✅ No regressions introduced

### 📊 Impact Assessment
- **Security Impact:** 🔴 Critical - Immediate attention required
- **Code Impact:** 🟢 Minimal - Non-breaking changes where possible
- **Performance Impact:** 🟢 Negligible - Optimized secure implementations

---

*🤖 This PR was automatically created by Patchy - AI-Powered Security Analysis Tool*  
*Powered by advanced AI models trained on security best practices*  
*Keeping your code secure, one repository at a time! 🛡️*

**Questions?** Review the detailed documentation in each fix file or contact our security team.
`;

  console.log(`Creating PR from ${forkOwner}:${newBranchName} to ${owner}/${repo}:${defaultBranch}`);
  
  try {
    const prResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: `🔒 Critical Security Fixes by Patchy AI (${analysisResult.summary.total_fixes} vulnerabilities)`,
        body: prBody,
        head: `${forkOwner}:${newBranchName}`,
        base: defaultBranch
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Patchy-Security-Bot'
        }
      }
    );
    
    console.log('✅ Pull request created successfully!');
    return {
      number: prResponse.data.number,
      title: prResponse.data.title,
      url: prResponse.data.html_url,
      state: prResponse.data.state,
      created: true,
      files_modified: appliedFixes.map(fix => fix.file),
      summary_file: 'PATCHY_SECURITY_FIXES.md',
      report_file: 'PATCHY_SECURITY_REPORT.md'
    };
  } catch (prError) {
    console.error('❌ PR Creation Failed:');
    console.error('Status:', prError.response?.status);
    console.error('Status Text:', prError.response?.statusText);
    console.error('Error Message:', prError.response?.data?.message);
    console.error('Documentation URL:', prError.response?.data?.documentation_url);
    console.error('Full Error Data:', JSON.stringify(prError.response?.data, null, 2));
    
    // Return partial success since files were modified successfully
    return {
      number: null,
      title: null,
      url: null,
      state: 'error',
      created: false,
      error: {
        status: prError.response?.status,
        message: prError.response?.data?.message || prError.message,
        documentation_url: prError.response?.data?.documentation_url
      },
      files_modified: appliedFixes.map(fix => fix.file),
      summary_file: 'PATCHY_SECURITY_FIXES.md',
      report_file: 'PATCHY_SECURITY_REPORT.md',
      partial_success: true,
      success_message: `Successfully applied ${appliedFixes.length} security fixes to files, but PR creation failed due to permissions.`
    };
  }

  return {
    number: prResponse.data.number,
    title: prResponse.data.title,
    url: prResponse.data.html_url,
    state: prResponse.data.state,
    created: true,
    files_included: [
      'PATCHY_SECURITY_REPORT.md',
      ...analysisResult.fixes.map((_, index) => `PATCHY_FIX_${index + 1}_*.md`)
    ]
  };
}

router.post('/patch', async (req, res) => {
  // Extend timeout for this specific endpoint (10 minutes)
  req.setTimeout(600000);
  res.setTimeout(600000);
  
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'GitHub repository URL is required'
      });
    }

    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(url);
    // Step 1: Fetch all files from GitHub
    const filesResponse = await getAllFileContents(owner, repo);

    // Step 2: Filter relevant files for security analysis
    const relevantFiles = filesResponse.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['js', 'ts', 'py', 'java', 'php', 'go', 'rb', 'cs', 'cpp', 'c'].includes(ext);
    });

    // Step 3: Send content for Vellum AI analysis
    const vellumResult = await executeVellumWorkflow({
      success: true,
      data: {
        repository: `${owner}/${repo}`,
        branch: 'main',
        totalFiles: relevantFiles.length,
        files: relevantFiles
      }
    });
    
    // Step 4: Process Vellum results and create security report
    const analysisResult = await processVellumResults(vellumResult, owner, repo);
    
    // Step 5: Create pull request with security fixes if issues found
    let pullRequestInfo = null;
    if (analysisResult.summary.total_fixes > 0) {
      try {
        pullRequestInfo = await createSecurityPullRequest(owner, repo, analysisResult);
        console.log(`✅ Security PR created successfully: ${pullRequestInfo.url}`);
      } catch (prError) {
        console.error('PR Creation Error:', prError.message);
        pullRequestInfo = {
          created: false,
          error: prError.message
        };
      }
    }
    
    // Step 6: Return comprehensive result
    res.json({
      status: 'success',
      analysis: analysisResult,
      pullRequest: pullRequestInfo,
      vellumRaw: vellumResult // Include raw Vellum data for debugging
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

/**
 * Analyze GitHub repository for security issues
 * POST /api/github/analyze
 * Body: { "repoUrl": "https://github.com/owner/repo" }
 */
// router.post('/analyze', async (req, res) => {
//   try {
//     const { repoUrl } = req.body;

//     if (!repoUrl) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'GitHub repository URL is required'
//       });
//     }

//     // Parse GitHub URL
//     const { owner, repo } = parseGitHubUrl(repoUrl);

//     // Check cache for existing analysis results
//     const cacheKey = `analysis-${owner}-${repo}`;
//     const cachedResult = repoCache.get(cacheKey);
//     if (cachedResult) {
//       return res.json(cachedResult);
//     }

//     // Step 1: Fetch all files from GitHub
//     const filesResponse = await getAllFileContents(owner, repo);

//     // Step 2: Filter relevant files for security analysis
//     const relevantFiles = filesResponse.filter(file => {
//       const ext = file.name.split('.').pop()?.toLowerCase();
//       return ['js', 'ts', 'py', 'java', 'php', 'go', 'rb', 'cs', 'cpp', 'c'].includes(ext);
//     });

//     // Step 3: Send content for Vellum AI analysis
//     const result = await processFilesWithVellum(relevantFiles, workflowId);

//     // Step 4: Call Vellum AI for security analysis (placeholder for now)
//     // TODO: Integrate with your existing Vellum workflow
//     const mockSecurityIssues = [
//       {
//         type: 'SQL Injection',
//         severity: 'high',
//         description: 'Potential SQL injection vulnerability detected',
//         file: 'src/database.js',
//         line: 42,
//         recommendation: 'Use parameterized queries instead of string concatenation'
//       },
//       {
//         type: 'XSS Vulnerability',
//         severity: 'medium',
//         description: 'User input not properly sanitized',
//         file: 'src/routes/user.js',
//         line: 18,
//         recommendation: 'Implement input validation and output encoding'
//       }
//     ];

//     // Step 5: Calculate summary
//     const summary = {
//       total: mockSecurityIssues.length,
//       critical: mockSecurityIssues.filter(i => i.severity === 'critical').length,
//       high: mockSecurityIssues.filter(i => i.severity === 'high').length,
//       medium: mockSecurityIssues.filter(i => i.severity === 'medium').length,
//       low: mockSecurityIssues.filter(i => i.severity === 'low').length
//     };

//     // Step 6: Automatically create PR with security fixes if issues found
//     let pullRequestInfo = null;
    
//     if (mockSecurityIssues.length > 0) {
//       try {
//         console.log(`Creating automated security fix PR for ${owner}/${repo}`);
        
//         // Fork the repository
//         const forkResponse = await axios.post(
//           `https://api.github.com/repos/${owner}/${repo}/forks`,
//           {},
//           {
//             headers: {
//               'Authorization': `Bearer ${GITHUB_TOKEN}`,
//               'Accept': 'application/vnd.github.v3+json',
//               'User-Agent': 'HackThe6ix-Backend'
//             }
//           }
//         );

//         const forkOwner = forkResponse.data.owner.login;
//         const forkName = forkResponse.data.name;

//         // Wait for fork to be ready
//         await new Promise(resolve => setTimeout(resolve, 2000));

//         // Get default branch
//         const repoInfoResponse = await axios.get(
//           `https://api.github.com/repos/${forkOwner}/${forkName}`,
//           {
//             headers: {
//               'Authorization': `Bearer ${GITHUB_TOKEN}`,
//               'Accept': 'application/vnd.github.v3+json',
//               'User-Agent': 'HackThe6ix-Backend'
//             }
//           }
//         );

//         const defaultBranch = repoInfoResponse.data.default_branch;

//         // Create new branch for security fixes
//         const newBranchName = `patchy-security-fixes-${Date.now()}`;
        
//         const branchResponse = await axios.get(
//           `https://api.github.com/repos/${forkOwner}/${forkName}/git/refs/heads/${defaultBranch}`,
//           {
//             headers: {
//               'Authorization': `Bearer ${GITHUB_TOKEN}`,
//               'Accept': 'application/vnd.github.v3+json',
//               'User-Agent': 'HackThe6ix-Backend'
//             }
//           }
//         );

//         const baseSha = branchResponse.data.object.sha;

//         await axios.post(
//           `https://api.github.com/repos/${forkOwner}/${forkName}/git/refs`,
//           {
//             ref: `refs/heads/${newBranchName}`,
//             sha: baseSha
//           },
//           {
//             headers: {
//               'Authorization': `Bearer ${GITHUB_TOKEN}`,
//               'Accept': 'application/vnd.github.v3+json',
//               'User-Agent': 'HackThe6ix-Backend'
//             }
//           }
//         );

//         // Create security report file
//         const securityReportContent = `# 🔒 Security Analysis Report

// ## Overview
// This security report was generated by **Patchy** - an automated security vulnerability detection and fixing tool.

// ## Analysis Results
// - **Repository:** ${owner}/${repo}
// - **Analysis Date:** ${new Date().toISOString()}
// - **Issues Found:** ${mockSecurityIssues.length}
// - **Files Analyzed:** ${relevantFiles.length}

// ## Security Issues Detected

// ${mockSecurityIssues.map((issue, index) => `
// ### ${index + 1}. ${issue.type} (${issue.severity.toUpperCase()})
// - **File:** \`${issue.file}\`
// - **Line:** ${issue.line}
// - **Description:** ${issue.description}
// - **Recommendation:** ${issue.recommendation}
// `).join('\n')}

// ## Summary by Severity
// - **Critical:** ${summary.critical}
// - **High:** ${summary.high}
// - **Medium:** ${summary.medium}
// - **Low:** ${summary.low}

// ## Next Steps
// 1. Review each security issue carefully
// 2. Implement the recommended fixes
// 3. Test your application thoroughly
// 4. Consider adding automated security testing to your CI/CD pipeline

// ---
// *🤖 This report was automatically generated by Patchy - Automated Security Analysis Tool*
// *For questions or support, please contact our team.*
// `;

//         // Commit the security report
//         await axios.put(
//           `https://api.github.com/repos/${forkOwner}/${forkName}/contents/PATCHY_SECURITY_REPORT.md`,
//           {
//             message: '🔒 Add comprehensive security analysis report',
//             content: Buffer.from(securityReportContent).toString('base64'),
//             branch: newBranchName
//           },
//           {
//             headers: {
//               'Authorization': `Bearer ${GITHUB_TOKEN}`,
//               'Accept': 'application/vnd.github.v3+json',
//               'User-Agent': 'HackThe6ix-Backend'
//             }
//           }
//         );

//         // Create pull request
//         const prResponse = await axios.post(
//           `https://api.github.com/repos/${owner}/${repo}/pulls`,
//           {
//             title: '🔒 Security Analysis by Patchy',
//             body: `## 🔒 Comprehensive Security Analysis

// ### 🛡️ Security Report
// ${mockSecurityIssues.length > 0 ? `We found ${mockSecurityIssues.length} potential security issues in your repository:` : 'Great news! No security issues were found in your repository.'}

// ${mockSecurityIssues.map((issue, index) => `
// ${index + 1}. **${issue.type}** (${issue.severity.toUpperCase()}) in \`${issue.file}\`
//    - ${issue.description}
//    - **Fix:** ${issue.recommendation}
// `).join('\n')}

// ### 📄 What's Included
// - **PATCHY_SECURITY_REPORT.md**: Detailed security analysis report
// - Comprehensive breakdown of all security issues
// - Specific recommendations for each vulnerability

// ### 🚀 Next Steps
// 1. Review the detailed report in \`PATCHY_SECURITY_REPORT.md\`
// 2. Implement the recommended security fixes
// 3. Test your application thoroughly
// 4. Merge this PR to keep the security report in your repository

// ---
// *🤖 This PR was automatically created by Patchy - Automated Security Analysis Tool*
// *Keeping your code secure, one repository at a time! 🛡️*`,
//             head: `${forkOwner}:${newBranchName}`,
//             base: defaultBranch
//           },
//           {
//             headers: {
//               'Authorization': `Bearer ${GITHUB_TOKEN}`,
//               'Accept': 'application/vnd.github.v3+json',
//               'User-Agent': 'HackThe6ix-Backend'
//             }
//           }
//         );

//         pullRequestInfo = {
//           number: prResponse.data.number,
//           title: prResponse.data.title,
//           url: prResponse.data.html_url,
//           state: prResponse.data.state,
//           created: true
//         };

//         console.log(`✅ Security PR created successfully: ${pullRequestInfo.url}`);

//       } catch (prError) {
//         console.error('PR Creation Error:', prError.response?.data || prError.message);
//         // Don't fail the entire request if PR creation fails
//         pullRequestInfo = {
//           created: false,
//           error: prError.response?.data?.message || prError.message
//         };
//       }
//     }

//     // Cache the analysis results
//     const analysisResult = {
//       status: 'success',
//       issues: mockSecurityIssues,
//       summary,
//       repository: repoUrl,
//       filesAnalyzed: relevantFiles.length,
//       pullRequest: pullRequestInfo
//     };
//     repoCache.set(cacheKey, analysisResult);

//     res.json(analysisResult);

//   } catch (error) {
//     console.error('Analysis Error:', error.message);
//     res.status(500).json({
//       status: 'error',
//       message: 'Failed to analyze repository',
//       error: error.message
//     });
//   }
// });

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

/**
 * DEMO: Fork repository, modify a file, and create PR
 * POST /api/github/demo-modify-and-pr
 * Body: { "repoUrl": "https://github.com/owner/repo" }
 */
router.post('/demo-modify-and-pr', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Repository URL is required'
      });
    }

    // Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);
    console.log(`Starting demo modification for ${owner}/${repo}`);

    // Step 1: Fork the repository
    console.log('Step 1: Forking repository...');
    const forkResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/forks`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    const forkOwner = forkResponse.data.owner.login;
    const forkName = forkResponse.data.name;
    console.log(`Fork created: ${forkOwner}/${forkName}`);

    // Wait a moment for fork to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Get the default branch and latest commit SHA
    console.log('Step 2: Getting repository info...');
    const repoInfoResponse = await axios.get(
      `https://api.github.com/repos/${forkOwner}/${forkName}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    const defaultBranch = repoInfoResponse.data.default_branch;
    console.log(`Default branch: ${defaultBranch}`);

    // Step 3: Create a new branch for our changes
    const newBranchName = `security-fix-demo-${Date.now()}`;
    console.log(`Step 3: Creating branch ${newBranchName}...`);

    // Get the SHA of the default branch
    const branchResponse = await axios.get(
      `https://api.github.com/repos/${forkOwner}/${forkName}/git/refs/heads/${defaultBranch}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    const baseSha = branchResponse.data.object.sha;

    // Create new branch
    await axios.post(
      `https://api.github.com/repos/${forkOwner}/${forkName}/git/refs`,
      {
        ref: `refs/heads/${newBranchName}`,
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

    console.log(`Branch ${newBranchName} created successfully`);

    // Step 4: Find a file to modify (let's try README.md first, then package.json)
    console.log('Step 4: Finding file to modify...');
    let targetFile = null;
    let targetPath = '';

    // Try to find README.md
    try {
      const readmeResponse = await axios.get(
        `https://api.github.com/repos/${forkOwner}/${forkName}/contents/README.md`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HackThe6ix-Backend'
          }
        }
      );
      targetFile = readmeResponse.data;
      targetPath = 'README.md';
      console.log('Found README.md to modify');
    } catch (error) {
      // Try package.json if README doesn't exist
      try {
        const packageResponse = await axios.get(
          `https://api.github.com/repos/${forkOwner}/${forkName}/contents/package.json`,
          {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'HackThe6ix-Backend'
            }
          }
        );
        targetFile = packageResponse.data;
        targetPath = 'package.json';
        console.log('Found package.json to modify');
      } catch (error2) {
        // Create a new security report file if neither exists
        targetPath = 'SECURITY_REPORT.md';
        console.log('Creating new SECURITY_REPORT.md file');
      }
    }

    // Step 5: Modify the file content
    console.log('Step 5: Modifying file content...');
    let newContent;
    let commitMessage;

    if (targetFile) {
      // Decode existing content and add our security note
      const existingContent = Buffer.from(targetFile.content, 'base64').toString('utf-8');
      
      if (targetPath === 'README.md') {
        newContent = existingContent + '\n\n## 🔒 Security Analysis\n\nThis repository has been analyzed for security vulnerabilities by Patchy - an automated security analysis tool.\n\n**Analysis Date:** ' + new Date().toISOString() + '\n**Status:** Demo modification completed\n';
        commitMessage = '🔒 Add security analysis section to README';
      } else if (targetPath === 'package.json') {
        const packageJson = JSON.parse(existingContent);
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts['security-check'] = 'echo "Security check completed by Patchy"';
        newContent = JSON.stringify(packageJson, null, 2);
        commitMessage = '🔒 Add security check script';
      }
    } else {
      // Create new security report file
      newContent = `# Security Analysis Report

## Overview
This security report was generated by **Patchy** - an automated security vulnerability detection and fixing tool.

## Analysis Details
- **Repository:** ${owner}/${repo}
- **Analysis Date:** ${new Date().toISOString()}
- **Status:** Demo analysis completed
- **Tool:** Patchy Security Analyzer

## Demo Modifications
This is a demonstration of how Patchy can:
1. Fork your repository
2. Create a new branch
3. Modify files with security fixes
4. Create a pull request with the changes

## Next Steps
In a real security analysis, this report would contain:
- Detected vulnerabilities
- Severity levels
- Recommended fixes
- Code patches

---
*Generated by Patchy - Automated Security Analysis Tool*
`;
      commitMessage = '🔒 Add security analysis report';
    }

    // Step 6: Commit the changes
    console.log('Step 6: Committing changes...');
    const updateData = {
      message: commitMessage,
      content: Buffer.from(newContent).toString('base64'),
      branch: newBranchName
    };

    if (targetFile) {
      updateData.sha = targetFile.sha; // Required for updating existing files
    }

    await axios.put(
      `https://api.github.com/repos/${forkOwner}/${forkName}/contents/${targetPath}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    console.log('File committed successfully');

    // Step 7: Create Pull Request
    console.log('Step 7: Creating pull request...');
    const prResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: '🔒 [DEMO] Security Analysis by Patchy',
        body: `## 🔒 Automated Security Analysis Demo

This pull request demonstrates how **Patchy** can automatically:

1. ✅ Fork your repository
2. ✅ Create a new branch for changes
3. ✅ Modify files with security improvements
4. ✅ Create a pull request with the changes

### Changes Made:
- Modified: \`${targetPath}\`
- Added security analysis information
- ${targetFile ? 'Updated existing file' : 'Created new security report'}

### Demo Status:
This is a **demonstration** of the Patchy workflow. In a real security analysis, this PR would contain actual vulnerability fixes and security improvements.

---
*🤖 This PR was automatically generated by Patchy - Automated Security Analysis Tool*`,
        head: `${forkOwner}:${newBranchName}`,
        base: defaultBranch
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'HackThe6ix-Backend'
        }
      }
    );

    console.log('Pull request created successfully');

    // Return success response
    res.json({
      success: true,
      message: 'Demo modification and PR creation completed successfully!',
      data: {
        originalRepo: `${owner}/${repo}`,
        fork: {
          owner: forkOwner,
          name: forkName,
          url: forkResponse.data.html_url
        },
        branch: newBranchName,
        modifiedFile: targetPath,
        pullRequest: {
          number: prResponse.data.number,
          title: prResponse.data.title,
          url: prResponse.data.html_url,
          state: prResponse.data.state
        },
        steps: [
          '✅ Repository forked',
          '✅ New branch created',
          '✅ File modified',
          '✅ Changes committed',
          '✅ Pull request created'
        ]
      }
    });

  } catch (error) {
    console.error('Demo Modification Error:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Demo modification failed',
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
  }
});

/**
 * Check GitHub token permissions and scopes
 * GET /api/github/check-token
 */
router.get('/check-token', async (req, res) => {
  try {
    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured'
      });
    }

    // Check token permissions by making a simple API call
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'HackThe6ix-Backend'
      }
    });

    // Get the scopes from the response headers
    const scopes = response.headers['x-oauth-scopes'] || 'No scopes found';
    
    res.json({
      success: true,
      user: {
        login: response.data.login,
        name: response.data.name,
        email: response.data.email
      },
      scopes: scopes.split(', ').filter(s => s.length > 0),
      tokenValid: true,
      message: 'Token is valid and working'
    });

  } catch (error) {
    console.error('Token Check Error:', error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Token validation failed',
      message: error.response?.data?.message || error.message,
      tokenValid: false
    });
  }
});

module.exports = router;
