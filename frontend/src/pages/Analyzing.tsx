import React, { useState, useEffect } from 'react';
import { Github, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Analyzing() {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing analysis...');

  const { repoUrl } = location.state || {};

  const messages = [
    'Initializing analysis...',
    'Cloning repository...',
    'Scanning files for vulnerabilities...',
    'Running security checks...',
    'Analyzing code patterns...',
    'Generating recommendations...',
    'Preparing results...'
  ];

  useEffect(() => {
    // If no repo URL was passed, redirect to home
    if (!repoUrl) {
      navigate('/');
      return;
    }

    // Simulate progress with realistic messages
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        
        // Update message based on progress
        const messageIndex = Math.min(Math.floor(newProgress / 15), messages.length - 1);
        setCurrentMessage(messages[messageIndex]);
        
        if (newProgress >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return newProgress;
      });
    }, 500);

    // Start actual analysis
    const analyzeRepo = async () => {
      try {
        const response = await axios.post('/api/github/analyze', {
          repoUrl: repoUrl.trim()
        });

        // Complete progress
        setAnalysisProgress(100);
        setCurrentMessage('Analysis complete!');
        
        // Navigate to results after a brief delay
        setTimeout(() => {
          navigate('/results', { 
            state: { 
              analysisResult: response.data,
              repoUrl: repoUrl.trim()
            } 
          });
        }, 1000);
      } catch (err: any) {
        // Navigate back to home with error
        navigate('/', { 
          state: { 
            error: err.response?.data?.message || 'Failed to analyze repository. Please try again.',
            repoUrl: repoUrl
          } 
        });
      }
    };

    analyzeRepo();

    return () => {
      clearInterval(progressInterval);
    };
  }, [repoUrl, navigate]);

  return (
    <div className="min-h-screen bg-gradient-radial text-white relative overflow-hidden">
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
              Analyzing Your Repository
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 pulse-glow">
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

          {/* Analyzing Animation */}
          <div className="glass-strong rounded-2xl p-12 mb-8 text-center">
            <div className="mb-8">
              <div className="relative inline-block">
                <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto spin-slow" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Analyzing Your Repository</h2>
            <p className="text-lg text-gray-600 mb-2">Our AI is scanning your code for security vulnerabilities...</p>
            <p className="text-md text-blue-600 mb-8 font-medium">{currentMessage}</p>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${analysisProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-sm text-gray-500">{Math.round(analysisProgress)}% Complete</p>
            
            {/* Fun loading indicators */}
            <div className="flex justify-center space-x-2 mt-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Repository Info */}
          <div className="glass-strong rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Repository</h3>
            <p className="text-gray-600 font-mono text-sm break-all">{repoUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analyzing;
