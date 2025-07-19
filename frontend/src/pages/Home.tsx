import React, { useState, useEffect } from 'react';
import { Github, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we received an error from the analyzing page
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      setRepoUrl(location.state.repoUrl || '');
    }
  }, [location.state]);

  const validateGitHubUrl = (url: string): boolean => {
    const githubPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    return githubPattern.test(url.trim());
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

    // Navigate to analyzing page with repo URL
    navigate('/analyzing', { 
      state: { 
        repoUrl: repoUrl.trim()
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-radial text-white relative overflow-hidden">
      <div className="relative z-10 flex-grow flex items-start justify-center pt-16">
        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-6">
              <div className="relative float-on-hover">
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
              <div className="flex items-center hover-lift">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 pulse-glow">
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-500">
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-500">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-sm font-medium ml-2 text-white">Results</span>
              </div>
            </div>
          </div>

          {/* Input Form */}
          <div className="glass-strong rounded-2xl p-8 mb-8 hover-lift">
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
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg placeholder-gray-500"
                  />
                  {repoUrl && validateGitHubUrl(repoUrl) && (
                    <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-green-500" />
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300/30 transition-all duration-300 btn-interactive hover-lift"
              >
                <div className="flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="Patchy Logo" 
                    className="w-6 h-6 mr-3 filter brightness-0 invert float-on-hover" 
                  />
                  Analyze with Patchy
                </div>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center py-12 text-white">
            <p className="text-lg">Powered by Vellum • Secure • Fast • Reliable • No sign-up required</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
