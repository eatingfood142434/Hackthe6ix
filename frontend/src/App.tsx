import React, { useState, useEffect } from 'react';
import { Github, AlertTriangle, CheckCircle, Loader2, Sparkles, Zap, Shield, ArrowRight, Copy, ExternalLink, GitBranch } from 'lucide-react';
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
}

type Step = 'input' | 'analyzing' | 'results';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>('input');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const validateGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    return githubRegex.test(url);
  };

  const simulateProgress = () => {
    setAnalysisProgress(0);
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    return interval;
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!validateGitHubUrl(repoUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)');
      return;
    }

    setError('');
    setCurrentStep('analyzing');
    setResult(null);

    const progressInterval = simulateProgress();

    try {
      const response = await axios.post('/api/github/analyze', {
        repoUrl: repoUrl.trim()
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      setTimeout(() => {
        setResult(response.data);
        setCurrentStep('results');
        if (response.data.issues.length === 0) {
          triggerConfetti();
        }
      }, 1000);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.response?.data?.message || 'Failed to analyze repository. Please try again.');
      setCurrentStep('input');
    }
  };

  const resetAnalysis = () => {
    setCurrentStep('input');
    setResult(null);
    setError('');
    setAnalysisProgress(0);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
            <div className="flex justify-center items-center mb-6 float">
              <div className="relative">
                <img src="/logo.png" alt="Logo" className="w-20 h-20 mr-4" />

              </div>
              <h1 className="text-6xl font-bold text-white">Patchy</h1>
            </div>
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Automatically detect and fix security vulnerabilities in your codebase
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center">
              {/* Step 1: Repository */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === 'input' ? 'bg-blue-500' : 'bg-blue-500'}`}>
                  <Github className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium ml-2 text-white">Repository</span>
              </div>
              
              {/* Arrow 1 */}
              <div className="w-12 h-px bg-white/30 mx-2 relative">
                <div className="absolute right-0 top-1/2 w-2 h-2 border-r-2 border-t-2 border-white/50 transform -translate-y-1/2 rotate-45"></div>
              </div>
              
              {/* Step 2: Analysis */}
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === 'analyzing' ? 'bg-blue-500' : 'bg-blue-500'}`}>
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
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === 'results' ? 'bg-blue-500' : 'bg-blue-500'}`}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-sm font-medium ml-2 text-white">Results</span>
              </div>
            </div>
          </div>

          {/* Input Step */}
          {currentStep === 'input' && (
            <div className="glass-strong rounded-2xl p-8 mb-8 hover-lift float">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="repoUrl" className="block text-lg font-medium text-gray-700 mb-3">
                    <Github className="w-5 h-5 inline mr-2" />
                    GitHub Repository URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      id="repoUrl"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-all duration-300 hover:border-blue-300 text-gray-600"
                    />
                    {repoUrl && validateGitHubUrl(repoUrl) && (
                      <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-green-500" />
                    )}
                  </div>
                  {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {error}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300/30 transition-all duration-300 btn-interactive hover-lift"
                >
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-6 h-6 inline mr-3 filter brightness-0 invert"
                  />
                  Analyze & Fix Security Issues
                </button>
              </form>
            </div>
          )}

          {/* Analyzing Step */}
          {currentStep === 'analyzing' && (
            <div className="glass-strong rounded-2xl p-12 mb-8 text-center">
              <div className="mb-8">
                <div className="relative inline-block">
                  <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto spin-slow" />
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Analyzing Your Repository</h2>
              <p className="text-lg text-gray-600 mb-8">Our AI is scanning your code for security vulnerabilities...</p>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">{Math.round(analysisProgress)}% Complete</p>
            </div>
          )}

          {/* Results Step */}
          {currentStep === 'results' && result && (
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

              {/* Issues or Success */}
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
                    <CheckCircle className="w-32 h-32 text-green-500 mx-auto mb-4" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Awesome! No Security Issues Found!</h3>
                  <p className="text-xl text-gray-600 mb-8">Your repository appears to be secure based on our analysis. Keep up the great work!</p>
                </div>
              )}

              {/* Pull Request */}
              {result.pullRequest && result.pullRequest.created && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mb-6 border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <GitBranch className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-800">🎉 Pull Request Created!</h3>
                  </div>
                  <p className="text-blue-700 mb-4">
                    We've automatically created a pull request with a detailed security analysis report.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={result.pullRequest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Pull Request #{result.pullRequest.number}
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(result.pullRequest?.url || '')}
                      className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={resetAnalysis}
                  className="px-8 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors btn-interactive"
                >
                  Analyze Another Repository
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center py-12 text-white">
            <p className="text-lg">Powered by Vellum • Secure • Fast • Reliable • No sign-up required</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
