import React, { useState, useEffect } from 'react';
import { Github, AlertTriangle, CheckCircle, Copy, ExternalLink, GitBranch } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file: string;
  line?: number;
  recommendation: string;
}

interface AnalysisResult {
  status: 'success' | 'error';
  issues: SecurityIssue[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  repository?: string;
  filesAnalyzed?: number;
  pullRequest?: {
    created: boolean;
    url: string;
    number: number;
  };
  prId?: string;
}

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [prStatus, setPrStatus] = useState<any>(null);
  const [pollingCount, setPollingCount] = useState(0);

  // Get data from navigation state
  const { analysisResult, repoUrl } = location.state || {};

  // Example issues for demonstration
  const exampleIssues: SecurityIssue[] = [
    {
      type: "SQL Injection",
      severity: "critical",
      description: "Unsanitized user input is directly concatenated into SQL queries, allowing potential SQL injection attacks.",
      file: "/server/database.js",
      line: 42,
      recommendation: "Use parameterized queries or prepared statements instead of string concatenation. Consider using an ORM like Sequelize or Prisma for safer database interactions."
    },
    {
      type: "Insecure Authentication",
      severity: "high",
      description: "Passwords are stored using weak hashing algorithm (MD5) which is vulnerable to rainbow table attacks.",
      file: "/server/auth/userModel.js",
      line: 78,
      recommendation: "Use bcrypt or Argon2 for password hashing with appropriate salt rounds. Never store passwords in plaintext or with weak hashing algorithms."
    },
    {
      type: "Cross-Site Scripting (XSS)",
      severity: "medium",
      description: "User-provided content is rendered directly in the DOM without sanitization, enabling potential XSS attacks.",
      file: "/frontend/src/components/Comments.jsx",
      line: 23,
      recommendation: "Sanitize user input before rendering to the DOM. Consider using DOMPurify or React's built-in XSS protection by avoiding dangerouslySetInnerHTML."
    },
    {
      type: "Outdated Dependency",
      severity: "low",
      description: "Using outdated version of axios (0.21.1) with known security vulnerabilities.",
      file: "/package.json",
      line: 15,
      recommendation: "Update axios to the latest version (0.27.2 or newer) to address security vulnerabilities. Regularly audit dependencies with npm audit or similar tools."
    }
  ];

  // Use example data if no real data is provided
  const result: AnalysisResult = analysisResult || {
    status: 'success',
    issues: exampleIssues,
    summary: {
      total: 4,
      critical: 1,
      high: 1,
      medium: 1,
      low: 1
    },
    repository: repoUrl || 'https://github.com/example/repo',
    filesAnalyzed: 42
  };

  useEffect(() => {
    // If no data was passed, redirect to home
    if (!location.state && !analysisResult) {
      navigate('/');
      return;
    }

    // Start PR polling if there's a prId
    if (analysisResult?.prId) {
      pollPrStatus(analysisResult.prId);
    }

    // Show confetti if no issues found
    if (result.issues.length === 0) {
      triggerConfetti();
    }
  }, [location.state, analysisResult, navigate, result.issues.length]);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const pollPrStatus = (prId: string) => {
    setPollingCount(0);
    
    const checkStatus = async () => {
      try {
        const statusResponse = await axios.get(`/api/github/pr-status/${prId}`);
        setPrStatus(statusResponse.data);
        
        if (statusResponse.data.status === 'completed' || statusResponse.data.status === 'error') {
          return;
        }
        
        setPollingCount(prev => {
          const newCount = prev + 1;
          if (newCount < 40) {
            setTimeout(checkStatus, 3000);
          }
          return newCount;
        });
      } catch (err) {
        console.error('Error polling PR status:', err);
      }
    };
    
    setTimeout(checkStatus, 3000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
      case 'low':
        return <img src="/logo.png" alt="Logo" className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetAnalysis = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-radial text-white relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex-grow flex items-start justify-center pt-16">
        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-6 float-on-hover">
              <div className="relative">
                <img src="/logo.png" alt="Logo" className="w-20 h-20 mr-4" />
              </div>
              <h1 className="text-6xl font-bold text-white">Patchy</h1>
            </div>
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Security Analysis Complete
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center">
              {/* Step 1: Repository */}
              <div className="flex items-center hover-lift">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
                  <Github className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium ml-2 text-white">Repository</span>
              </div>
              
              {/* Arrow 1 */}
              <div className="w-12 h-px bg-white/30 mx-2 relative">
                <div className="absolute right-0 top-1/2 w-2 h-2 border-r-2 border-t-2 border-white/50 transform -translate-y-1/2 rotate-45"></div>
              </div>
              
              {/* Step 2: Analysis */}
              <div className="flex items-center hover-lift">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-sm font-medium ml-2 text-white">Analysis</span>
              </div>
              
              {/* Arrow 2 */}
              <div className="w-12 h-px bg-white/30 mx-2 relative">
                <div className="absolute right-0 top-1/2 w-2 h-2 border-r-2 border-t-2 border-white/50 transform -translate-y-1/2 rotate-45"></div>
              </div>
              
              {/* Step 3: Results */}
              <div className="flex items-center hover-lift">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-sm font-medium ml-2 text-white">Results</span>
              </div>
            </div>
          </div>

          {/* Results Content */}
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="glass-strong p-6 rounded-xl text-center hover-lift">
                <div className="text-3xl font-bold text-gray-900">{result.summary.total}</div>
                <div className="text-sm text-gray-600">Total Issues</div>
              </div>
              <div className="glass-strong p-6 rounded-xl text-center hover-lift bg-gradient-to-br from-red-50 to-red-100">
                <div className="text-3xl font-bold text-red-600">{result.summary.critical}</div>
                <div className="text-sm text-red-600">Critical</div>
              </div>
              <div className="glass-strong p-6 rounded-xl text-center hover-lift bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="text-3xl font-bold text-orange-600">{result.summary.high}</div>
                <div className="text-sm text-orange-600">High</div>
              </div>
              <div className="glass-strong p-6 rounded-xl text-center hover-lift bg-gradient-to-br from-yellow-50 to-yellow-100">
                <div className="text-3xl font-bold text-yellow-600">{result.summary.medium}</div>
                <div className="text-sm text-yellow-600">Medium</div>
              </div>
              <div className="glass-strong p-6 rounded-xl text-center hover-lift bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-3xl font-bold text-blue-600">{result.summary.low}</div>
                <div className="text-sm text-blue-600">Low</div>
              </div>
            </div>

            {/* Issues */}
            {result.issues.length > 0 ? (
              <div className="glass-strong rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Security Issues Found</h3>
                <div className="space-y-4">
                  {result.issues.map((issue, index) => (
                    <div
                      key={index}
                      className={`border-2 rounded-xl p-6 hover-lift transition-all duration-300 ${getSeverityColor(issue.severity)}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          {getSeverityIcon(issue.severity)}
                          <span className="ml-3 font-bold capitalize text-lg">{issue.severity}</span>
                          <span className="ml-3 text-gray-400">•</span>
                          <span className="ml-3 font-semibold">{issue.type}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(issue.recommendation)}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                            title="Copy recommendation"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-800 mb-4 text-lg">{issue.description}</p>
                      <div className="text-sm text-gray-600 mb-4 bg-white p-3 rounded-lg">
                        <code className="font-mono">{issue.file}</code>
                        {issue.line && <span className="ml-2">Line {issue.line}</span>}
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <strong className="text-blue-800">Recommendation:</strong>
                        <p className="text-blue-700 mt-1">{issue.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-strong rounded-2xl p-12 text-center">
                <div className="mb-6">
                  <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">🎉 Great Job!</h3>
                  <p className="text-xl text-gray-600">No security issues found in your repository!</p>
                </div>
              </div>
            )}

            {/* PR Status */}
            {prStatus && (
              <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  <GitBranch className="w-5 h-5 inline mr-2" />
                  Pull Request Status
                </h3>
                {prStatus.status === 'creating' && (
                  <div className="flex items-center text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Creating pull request with security fixes...
                  </div>
                )}
                {prStatus.status === 'completed' && prStatus.pullRequest && (
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-medium">✅ Pull request created successfully!</span>
                    <a
                      href={prStatus.pullRequest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      View PR <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetAnalysis}
                className="px-8 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors btn-interactive"
              >
                Analyze Another Repository
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
