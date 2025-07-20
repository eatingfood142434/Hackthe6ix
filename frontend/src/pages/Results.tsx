import React, { useState, useEffect } from 'react';
import { Github, AlertTriangle, CheckCircle, Copy, ExternalLink, GitBranch, FileText, Shield, Clock, Settings, Home } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface SecurityFix {
  file_path: string;
  vulnerability_type: string;
  fixed_code: string;
  explanation: string;
  security_notes: string;
  fix_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  additional_imports: string[];
  testing_recommendations: string[];
  breaking_changes: boolean;
  alternative_solutions: Array<{
    approach: string;
    pros: string[];
    cons: string[];
  }>;
  configuration_changes: Array<{
    file: string;
    change: string;
    example: string;
  }>;
}

interface FixSummary {
  total_fixes: number;
  files_modified: number;
  high_confidence_fixes: number;
  medium_confidence_fixes: number;
  low_confidence_fixes: number;
  breaking_changes_count: number;
  estimated_fix_time: string;
  priority_order: string[];
}

interface DeploymentStep {
  step: number;
  action: string;
  command: string;
  verification: string;
}

interface ImplementationGuide {
  prerequisites: string[];
  deployment_steps: DeploymentStep[];
  rollback_plan: string;
  monitoring_recommendations: string[];
}

interface VellumAnalysisResult {
  type: string;
  title: string;
  description: string;
  fixes: SecurityFix[];
  fix_summary: FixSummary;
  implementation_guide: ImplementationGuide;
  scanned_files?: any;
}

interface AnalysisResult {
  status: 'success' | 'error';
  data?: VellumAnalysisResult;
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

  // Sample Vellum response data for testing
  const sampleVellumData: VellumAnalysisResult = {
    type: "object",
    title: "Security Fix Generator Output",
    description: "Output schema for the security fix generation block",
    fixes: [
      {
        file_path: "web1/index.html",
        vulnerability_type: "INFORMATION_DISCLOSURE",
        fixed_code: `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Welcome to Web-1</title>
    <!-- SECURITY: The secret flag has been removed from the client side. Never expose
         secrets in frontend resources – deliver them via authenticated, server-side
         APIs if they must be displayed at all. -->
</head>
<body>
    <h1>Welcome!</h1>
    <p>If you have an account please login to view your dashboard.</p>
</body>
</html>`,
        explanation: "Removed the hard-coded FLAG value that was previously visible to every visitor. Keeping the file 100% static preserves original presentation while eliminating information disclosure.",
        security_notes: "Secrets should be delivered only after successful authentication and authorisation. If they are user-specific, consider token-based APIs or server-side templating with proper access control.",
        fix_confidence: "HIGH",
        additional_imports: [],
        testing_recommendations: [
          "Load /index.html in a browser and ensure the flag no longer appears.",
          "Search entire repository for remnants of the FLAG value."
        ],
        breaking_changes: false,
        alternative_solutions: [],
        configuration_changes: []
      },
      {
        file_path: "web2/exec/app.py",
        vulnerability_type: "CODE_INJECTION",
        fixed_code: `import os
import ast
import operator as op
from flask import Flask, request, render_template, abort

app = Flask(__name__)

# Safe evaluator – replaces the previous exec/eval calls
_ALLOWED_OPS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
}

def _safe_eval(expr: str):
    """Safely evaluate an arithmetic expression without exec/eval."""
    if len(expr) > 100:
        raise ValueError("Expression too long")
    
    tree = ast.parse(expr, mode="eval")
    # ... implementation details
    
@app.route("/", methods=["GET", "POST"])
def index():
    result = None
    expr = ""
    if request.method == "POST":
        expr = request.form.get("expression", "").strip()
        try:
            result = _safe_eval(expr)
        except Exception as exc:
            abort(400, description=f"Invalid expression: {exc}")
    
    return render_template("index.html", result=result, expr=expr)`,
        explanation: "The vulnerable exec() call has been replaced with a strict AST-based arithmetic evaluator that only supports numeric literals and basic operators. This prevents arbitrary code execution while preserving original functionality.",
        security_notes: "• Added length limit to mitigate DoS.\n• Flask debug mode disabled.\n• No globals are exposed to the expression evaluator.",
        fix_confidence: "HIGH",
        additional_imports: ["ast", "operator"],
        testing_recommendations: [
          "Submit harmless expressions (e.g. 1+2*3) and verify correct result.",
          "Try to submit malicious payloads like `__import__('os').system('id')` and verify they are rejected with 400."
        ],
        breaking_changes: false,
        alternative_solutions: [
          {
            approach: "Use a third-party sandboxed evaluator such as `simpleeval` or `asteval`.",
            pros: [
              "Reduced maintenance.",
              "More mathematical functions supported."
            ],
            cons: [
              "Adds external dependency.",
              "Still requires careful configuration to remain secure."
            ]
          }
        ],
        configuration_changes: []
      },
      {
        file_path: "web5/dist/app.py",
        vulnerability_type: "SQL_INJECTION",
        fixed_code: `import os
import sqlite3
import hashlib
from flask import Flask, request, render_template, redirect, url_for, session, g, abort

DATABASE = os.getenv("DB_PATH", "db.sqlite3")
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET", os.urandom(32))

@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = request.form.get("username", "")
        pw   = request.form.get("password", "")
        cur = get_db().execute(
            "SELECT id FROM users WHERE username=? AND password_hash=?",
            (user, _hash_pw(pw))
        )
        row = cur.fetchone()
        if row:
            session["uid"] = row["id"]
            return redirect(url_for("dashboard"))
        abort(401, "Invalid credentials")
    return render_template("index.html")`,
        explanation: "Replaced dangerous f-string SQL concatenation with parameterised ? placeholders, completely eliminating SQL injection possibilities.",
        security_notes: "Passwords are now hashed; consider using `passlib` with bcrypt for production-grade hashing.",
        fix_confidence: "HIGH",
        additional_imports: ["hashlib"],
        testing_recommendations: [
          "Login with valid credentials – success.",
          "Attempt `' OR 1=1--` injection – expect authentication failure."
        ],
        breaking_changes: false,
        alternative_solutions: [],
        configuration_changes: []
      }
    ],
    fix_summary: {
      total_fixes: 3,
      files_modified: 3,
      high_confidence_fixes: 3,
      medium_confidence_fixes: 0,
      low_confidence_fixes: 0,
      breaking_changes_count: 0,
      estimated_fix_time: "1.5 – 2 hours including testing",
      priority_order: [
        "web2/exec/app.py",
        "web5/dist/app.py", 
        "web1/index.html"
      ]
    },
    implementation_guide: {
      prerequisites: [
        "Python 3.9+ and PHP 8.0+ installed",
        "Docker / Docker-Compose installed for containerised apps",
        "Access to environment-variable management (CI/CD secrets)"
      ],
      deployment_steps: [
        {
          step: 1,
          action: "Commit code changes to a feature branch and push.",
          command: "git checkout -b security/fixes && git add . && git commit -m \"Apply security patches\"",
          verification: "CI pipeline runs unit-tests and linting without errors."
        },
        {
          step: 2,
          action: "Create .env files or secret store entries for removed hard-coded values.",
          command: "echo 'FLASK_SECRET=$(openssl rand -hex 32)' >> .env",
          verification: "Secrets are NOT committed to VCS."
        },
        {
          step: 3,
          action: "Build and start containers.",
          command: "docker compose up --build -d",
          verification: "`docker compose ps` shows healthy services."
        }
      ],
      rollback_plan: "Revert to previous git tag (e.g. `git checkout v1.0.3`) and redeploy containers from that tag. Restore DB from last backup if schema changed.",
      monitoring_recommendations: [
        "Application error rates (5xx) after deployment",
        "Authentication failure counts (should not spike)",
        "DB query logs for injection attempts",
        "Container/environment variable leakage scans"
      ]
    }
  };

  // Extract result data - handle both real API response and sample data
  const result = location.state?.analysisResult;
  
  // Extract data from actual Vellum response
  let data: VellumAnalysisResult;
  
  // Debug: Log the entire result structure to understand what we're getting
  console.log('=== FULL RESULT STRUCTURE ===');
  console.log('result:', result);
  console.log('result.vellumRaw:', result?.vellumRaw);
  console.log('result.analysis:', result?.analysis);
  console.log('result.pullRequest:', result?.pullRequest);
  
  if (result && result.vellumRaw && Array.isArray(result.vellumRaw)) {
    // Extract from actual Vellum response array
    const resultsOutput = result.vellumRaw.find((output: any) => output.name === 'results');
    const scannedFilesOutput = result.vellumRaw.find((output: any) => output.name === 'scanned-files');
    
    console.log('=== VELLUM OUTPUTS ===');
    console.log('resultsOutput:', resultsOutput);
    console.log('scannedFilesOutput:', scannedFilesOutput);
    
    // Debug fix data structure to understand severity/risk fields
    if (resultsOutput?.value?.fixes) {
      console.log('=== FIX DATA STRUCTURE DEBUG ===');
      resultsOutput.value.fixes.forEach((fix: any, index: number) => {
        console.log(`Fix ${index}:`, {
          file_path: fix.file_path,
          vulnerability_type: fix.vulnerability_type,
          fix_confidence: fix.fix_confidence,
          severity: fix.severity,
          risk_level: fix.risk_level,
          priority: fix.priority,
          all_keys: Object.keys(fix)
        });
      });
      
      // Also check if there's summary data from backend
      console.log('=== BACKEND SUMMARY DATA ===');
      console.log('fix_summary from backend:', resultsOutput?.value?.fix_summary);
    }
    
    data = {
      type: 'security_analysis',
      title: 'Security Analysis Results',
      description: 'Automated security vulnerability analysis and fixes',
      fixes: resultsOutput?.value?.fixes || [],
      fix_summary: resultsOutput?.value?.fix_summary || {
        total_fixes: resultsOutput?.value?.fixes?.length || 0,
        files_modified: resultsOutput?.value?.fixes?.length || 0,
        high_confidence_fixes: resultsOutput?.value?.fixes?.filter((f: any) => f.fix_confidence === 'HIGH').length || 0,
        medium_confidence_fixes: resultsOutput?.value?.fixes?.filter((f: any) => f.fix_confidence === 'MEDIUM').length || 0,
        low_confidence_fixes: resultsOutput?.value?.fixes?.filter((f: any) => f.fix_confidence === 'LOW').length || 0,
        breaking_changes_count: resultsOutput?.value?.fixes?.filter((f: any) => f.breaking_changes).length || 0,
        estimated_fix_time: resultsOutput?.value?.fix_summary?.estimated_fix_time || '~2 hours',
        priority_order: resultsOutput?.value?.fixes?.map((f: any) => f.file_path) || []
      },
      implementation_guide: resultsOutput?.value?.implementation_guide || {
        prerequisites: ['Create backups or commit current state to VCS'],
        deployment_steps: resultsOutput?.value?.implementation_guide?.deployment_steps || [],
        rollback_plan: resultsOutput?.value?.implementation_guide?.rollback_plan || 'Restore from backup',
        monitoring_recommendations: resultsOutput?.value?.implementation_guide?.monitoring_recommendations || []
      },
      scanned_files: scannedFilesOutput?.value || null
    };
  } else {
    // Fallback to sample data or direct result
    data = result?.data || sampleVellumData;
  }

  // Ensure data is never undefined
  if (!data) {
    data = sampleVellumData;
  }

  // Use the extracted data
  const resultData: AnalysisResult = {
    status: 'success',
    data,
    repository: result?.analysis?.summary?.repository || 'example/security-repo',
    filesAnalyzed: result?.analysis?.summary?.total_files_scanned || data?.fixes?.length || 10,
    pullRequest: result?.pullRequest || {
      created: true,
      url: 'https://github.com/example/security-repo/pull/1',
      number: 1
    }
  };

  // Debug log to check if data is properly set
  console.log('Sample Vellum Data:', sampleVellumData);
  console.log('Result Data:', result?.data);
  console.log('Fix Summary:', result?.data?.fix_summary);
  console.log('Extracted Data:', data);
  console.log('Final Result Data:', resultData);

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
    if (result.data && result.data.fixes.length === 0) {
      triggerConfetti();
    }
  }, [location.state, analysisResult, navigate, result.data?.fixes.length]);

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

  // Normalize confidence values to handle different formats
  const normalizeConfidence = (confidence: any): string => {
    if (!confidence) return 'UNKNOWN';
    
    const confidenceStr = String(confidence).toUpperCase().trim();
    
    // Handle different possible formats
    if (confidenceStr.includes('HIGH')) return 'HIGH';
    if (confidenceStr.includes('MEDIUM')) return 'MEDIUM';
    if (confidenceStr.includes('LOW')) return 'LOW';
    
    // Handle numeric confidence (if any)
    if (confidenceStr === '3') return 'HIGH';
    if (confidenceStr === '2') return 'MEDIUM';
    if (confidenceStr === '1') return 'LOW';
    
    console.warn('Unknown confidence format:', confidence);
    return 'UNKNOWN';
  };

  // Get severity/risk level from fix data
  const getSeverityLevel = (fix: any): string => {
    // Check various possible severity fields
    if (fix.severity) return String(fix.severity).toUpperCase();
    if (fix.risk_level) return String(fix.risk_level).toUpperCase();
    if (fix.priority) {
      const priority = String(fix.priority).toUpperCase();
      if (priority === 'HIGH' || priority === 'CRITICAL') return 'HIGH';
      if (priority === 'MEDIUM') return 'MEDIUM';
      if (priority === 'LOW') return 'LOW';
    }
    
    // Fallback: determine severity from vulnerability type
    const vulnType = String(fix.vulnerability_type || '').toUpperCase();
    if (vulnType.includes('INJECTION') || vulnType.includes('XSS') || vulnType.includes('CSRF')) {
      return 'HIGH'; // Security vulnerabilities are typically high severity
    }
    
    return 'MEDIUM'; // Default to medium if unknown
  };

  const getSeverityColor = (fix: any) => {
    const severity = getSeverityLevel(fix);
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return 'border-red-300 bg-red-50';
      case 'MEDIUM':
        return 'border-orange-300 bg-orange-50';
      case 'LOW':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityIcon = (fix: any) => {
    const severity = getSeverityLevel(fix);
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'LOW':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      default:
        return <CheckCircle className="w-6 h-6 text-gray-600" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetAnalysis = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-radial text-white relative overflow-x-hidden" style={{ overscrollBehaviorX: 'none', touchAction: 'pan-y' }}>
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
            <div className="flex justify-center items-center mb-6 relative">
              <div className="relative">
                <img src="/logo.png" alt="Logo" className="w-20 h-20 mr-4" />
              </div>
              <h1 className="text-6xl font-bold text-white">Patchy</h1>
              {/* Return Home Button */}
              <button
                onClick={() => navigate('/')}
                className="absolute right-0 -top-8 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-white/20"
                title="Return to Home"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
            </div>
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Security Analysis Complete
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center">
              {/* Step 1: Repository */}
              <div className="flex items-center">
                <div className="hover-lift w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
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
                <div className="hover-lift w-10 h-10 rounded-full flex items-center justify-center bg-green-500">
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
                <div className="hover-lift w-10 h-10 rounded-full flex items-center justify-center bg-blue-500">
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
            {result.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-strong p-6 rounded-xl text-center hover-lift">
                  <div className="text-3xl font-bold text-gray-900">{result.data.fix_summary?.total_fixes || 0}</div>
                  <div className="text-sm text-gray-600">Total Fixes</div>
                </div>
                <div className="glass-strong p-6 rounded-xl text-center hover-lift bg-gradient-to-br from-green-50 to-green-100">
                  <div className="text-3xl font-bold text-green-600">{result.data.fix_summary?.files_modified || 0}</div>
                  <div className="text-sm text-green-600">Files Modified</div>
                </div>
                <div className="glass-strong p-6 rounded-xl text-center hover-lift bg-gradient-to-br from-orange-50 to-orange-100">
                  <div className="text-3xl font-bold text-orange-600">{result.data.fix_summary?.breaking_changes_count || 0}</div>
                  <div className="text-sm text-orange-600">Breaking Changes</div>
                </div>
                <div className="glass-strong p-6 rounded-xl text-center hover-lift bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="text-2xl font-bold text-purple-600">
                    <Clock className="w-5 h-5 inline" />
                  </div>
                  <div className="text-sm text-purple-600">{result.data.fix_summary?.estimated_fix_time || '~2 hours'}</div>
                </div>
              </div>
            )}

            {/* Fixes */}
            {resultData?.data && resultData.data.fixes && resultData.data.fixes.length > 0 && (
              <div className="glass-strong rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Security Fixes</h3>
                <div className="space-y-4">
                  {resultData.data.fixes.map((fix: any, index: number) => (
                    <div
                      key={index}
                      className={`border-2 rounded-xl p-6 hover-lift transition-all duration-300 ${getSeverityColor(fix)}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          {getSeverityIcon(fix)}
                          <span className={`ml-3 font-bold capitalize text-lg ${
                            getSeverityLevel(fix) === 'HIGH' ? 'text-red-800' : 
                            getSeverityLevel(fix) === 'MEDIUM' ? 'text-orange-800' : 
                            getSeverityLevel(fix) === 'LOW' ? 'text-yellow-800' : 
                            'text-gray-800'
                          }`}>{getSeverityLevel(fix)} Risk</span>
                          <span className={`ml-3 ${
                            getSeverityLevel(fix) === 'HIGH' ? 'text-red-900' : 
                            getSeverityLevel(fix) === 'MEDIUM' ? 'text-orange-900' : 
                            getSeverityLevel(fix) === 'LOW' ? 'text-yellow-900' : 
                            'text-gray-900'
                          }`}>•</span>
                          <span className={`ml-3 font-semibold ${
                            getSeverityLevel(fix) === 'HIGH' ? 'text-red-700' : 
                            getSeverityLevel(fix) === 'MEDIUM' ? 'text-orange-700' : 
                            getSeverityLevel(fix) === 'LOW' ? 'text-yellow-700' : 
                            'text-gray-700'
                          }`}>{fix.vulnerability_type}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(fix.fixed_code)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy fixed code"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                          <span className={`text-xs font-medium px-3 py-1 rounded-full inline-flex items-center justify-center ${
                            normalizeConfidence(fix.fix_confidence) === 'HIGH' ? 'bg-green-100 text-green-800' : 
                            normalizeConfidence(fix.fix_confidence) === 'MEDIUM' ? 'bg-blue-100 text-blue-800' : 
                            normalizeConfidence(fix.fix_confidence) === 'LOW' ? 'bg-gray-100 text-gray-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {normalizeConfidence(fix.fix_confidence)} Confidence
                          </span>
                          {fix.breaking_changes && (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full inline-flex items-center justify-center">
                              Breaking Changes
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-800 mb-4 text-lg">{fix.explanation}</p>
                      
                      <div className="text-sm text-gray-600 mb-4 bg-white p-3 rounded-lg">
                        <FileText className="w-4 h-4 inline mr-2" />
                        <code className="font-mono">{fix.file_path}</code>
                      </div>

                      {/* Security Notes */}
                      {fix.security_notes && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <div className="flex items-center mb-2">
                            <Shield className="w-4 h-4 text-blue-600 mr-2" />
                            <strong className="text-blue-800">Security Notes:</strong>
                          </div>
                          <p className="text-blue-700 text-sm whitespace-pre-line">{fix.security_notes}</p>
                        </div>
                      )}

                      {/* Fixed Code */}
                      <div className={`p-4 rounded-lg mb-4 ${
                        fix.fix_confidence === 'HIGH' ? 'bg-red-100' : 
                        fix.fix_confidence === 'MEDIUM' ? 'bg-orange-100' : 
                        fix.fix_confidence === 'LOW' ? 'bg-yellow-100' : 
                        'bg-gray-100'
                      }`}>
                        <strong className={`${
                          fix.fix_confidence === 'HIGH' ? 'text-red-800' : 
                          fix.fix_confidence === 'MEDIUM' ? 'text-orange-800' : 
                          fix.fix_confidence === 'LOW' ? 'text-yellow-800' : 
                          'text-gray-800'
                        }`}>Fixed Code:</strong>
                        <pre className="mt-2 text-sm bg-white text-gray-900 p-3 rounded border border-gray-300 overflow-x-auto">
                          <code className="font-mono">{fix.fixed_code}</code>
                        </pre>
                      </div>

                      {/* Additional Imports */}
                      {fix.additional_imports.length > 0 && (
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                          <strong className="text-purple-800">Additional Imports Required:</strong>
                          <ul className="mt-1 text-sm text-purple-700">
                            {fix.additional_imports.map((imp: string, idx: number) => (
                              <li key={idx} className="font-mono">• {imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Testing Recommendations */}
                      {fix.testing_recommendations.length > 0 && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                          <strong className="text-green-800">Testing Recommendations:</strong>
                          <ul className="mt-1 text-sm text-green-700 space-y-1">
                            {fix.testing_recommendations.map((test: string, idx: number) => (
                              <li key={idx}>• {test}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Alternative Solutions */}
                      {fix.alternative_solutions.length > 0 && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                          <strong className="text-yellow-800">Alternative Solutions:</strong>
                          {fix.alternative_solutions.map((alt: any, idx: number) => (
                            <div key={idx} className="mt-2 text-sm">
                              <div className="font-medium text-yellow-800">{alt.approach}</div>
                              <div className="ml-4 mt-1">
                                <div className="text-green-700">
                                  <strong>Pros:</strong> {(alt.pros || []).join(', ')}
                                </div>
                                <div className="text-red-700">
                                  <strong>Cons:</strong> {(alt.cons || []).join(', ')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Configuration Changes */}
                      {fix.configuration_changes.length > 0 && (
                        <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                          <strong className="text-indigo-800">Configuration Changes:</strong>
                          {fix.configuration_changes.map((config: any, idx: number) => (
                            <div key={idx} className="mt-2 text-sm">
                              <div className="font-medium text-indigo-800">File: {config.file}</div>
                              <div className="text-indigo-700">{config.change}</div>
                              <code className="text-xs bg-white text-gray-900 p-1 rounded border border-gray-300 font-mono">{config.example}</code>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Implementation Guide */}
            {resultData?.data && (
              <div className="glass-strong rounded-2xl p-8 mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Settings className="w-6 h-6 mr-2" />
                  Implementation Guide
                </h3>
                
                {/* Fix Summary */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-bold text-blue-900 mb-3">Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{resultData.data.fix_summary?.total_fixes || 0}</div>
                      <div className="text-blue-700">Total Fixes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{resultData.data.fix_summary?.files_modified || 0}</div>
                      <div className="text-green-700">Files Modified</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{resultData.data.fix_summary?.breaking_changes_count || 0}</div>
                      <div className="text-orange-700">Breaking Changes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        <Clock className="w-5 h-5 inline" />
                      </div>
                      <div className="text-purple-700">{resultData.data.fix_summary?.estimated_fix_time || '~2 hours'}</div>
                    </div>
                  </div>
                </div>

                {/* Priority Order */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Priority Order</h4>
                  <div className="space-y-2">
                    {(resultData.data.fix_summary?.priority_order || []).map((file: string, index: number) => (
                      <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                          {index + 1}
                        </span>
                        <code className="font-mono text-sm text-gray-800">{file}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prerequisites */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Prerequisites</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 bg-gray-50 p-4 rounded-lg">
                    {(resultData.data.implementation_guide?.prerequisites || []).map((prerequisite: string, index: number) => (
                      <li key={index}>{prerequisite}</li>
                    ))}
                  </ul>
                </div>

                {/* Deployment Steps */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Deployment Steps</h4>
                  <div className="space-y-4">
                    {(resultData.data.implementation_guide?.deployment_steps || []).map((step: any, index: number) => (
                      <div key={index} className="border-l-4 border-l-green-500 border border-gray-200 rounded-lg p-4 bg-white shadow-sm" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start">
                            <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3 mt-1 flex-shrink-0">
                              {step.step}
                            </span>
                            <div className="flex-1" style={{ minWidth: 0 }}>
                              <h5 className="font-semibold text-gray-900 mb-1">{step.action}</h5>
                            </div>
                          </div>
                          {step.command && step.command !== 'null' && (
                            <button
                              onClick={() => copyToClipboard(step.command)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                              title="Copy command"
                            >
                              <Copy className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                        </div>
                        <div className="ml-11">
                          {step.command && step.command !== 'null' && (
                            <div className="mb-2">
                              <strong className="text-sm text-gray-700">Command:</strong>
                              <div className="mt-1 bg-white rounded border border-gray-300 overflow-x-auto" style={{ width: '100%' }}>
                                <pre className="p-2 text-gray-900 text-sm font-mono whitespace-nowrap m-0">
                                  <code>{step.command}</code>
                                </pre>
                              </div>
                            </div>
                          )}
                          <div>
                            <strong className="text-sm text-gray-700">Verification:</strong>
                            <p className="text-sm text-gray-600 mt-1">{step.verification}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rollback Plan */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Rollback Plan</h4>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{resultData.data.implementation_guide?.rollback_plan || 'Restore from backup'}</p>
                  </div>
                </div>

                {/* Monitoring Recommendations */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Monitoring Recommendations</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    {(resultData.data.implementation_guide?.monitoring_recommendations || []).map((recommendation: string, index: number) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Pull Request */}
            {resultData.pullRequest && resultData.pullRequest.created && (
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
                    href={resultData.pullRequest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-lift inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Pull Request
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(resultData.pullRequest?.url || '')}
                    className="hover-lift inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-t-2 border-blue-600 mr-2"></div>
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
