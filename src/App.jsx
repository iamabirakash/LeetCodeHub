import React, { useState, useEffect } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import ReactDiffViewer from 'react-diff-viewer-continued';

const App = () => {
  const [fileContent, setFileContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [token, setToken] = useState('');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | confirming
  
  const [repos, setRepos] = useState([]);
  const [leetCodeUrl, setLeetCodeUrl] = useState('');
  const [existingCode, setExistingCode] = useState('');
  const [stagedSha, setStagedSha] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('githubToken');
    const savedOwner = localStorage.getItem('githubOwner');
    const savedRepo = localStorage.getItem('githubRepo');
    if (savedToken) setToken(savedToken);
    if (savedOwner) setRepoOwner(savedOwner);
    if (savedRepo) setRepoName(savedRepo);
  }, []);

  useEffect(() => {
    const fetchUserAndRepos = async () => {
      if (!token) return;
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        };
        const userRes = await fetch('https://api.github.com/user', { headers });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (!repoOwner) {
            setRepoOwner(userData.login);
            localStorage.setItem('githubOwner', userData.login);
          }
        }
        
        const reposRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', { headers });
        if (reposRes.ok) {
          const reposData = await reposRes.json();
          setRepos(reposData.map(r => r.name));
        }
      } catch (err) {
        console.error('Failed to fetch github data:', err);
      }
    };
    fetchUserAndRepos();
  }, [token]);

  const handleTokenChange = (e) => {
    setToken(e.target.value);
    localStorage.setItem('githubToken', e.target.value);
  };

  const handleOwnerChange = (e) => {
    setRepoOwner(e.target.value);
    localStorage.setItem('githubOwner', e.target.value);
  };

  const handleRepoChange = (e) => {
    setRepoName(e.target.value);
    localStorage.setItem('githubRepo', e.target.value);
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setLeetCodeUrl(url);
    
    // Attempt parsing LeetCode URL pattern: leetcode.com/problems/your-problem-slug/
    const match = url.match(/leetcode\.com\/problems\/([^/]+)/);
    if (match && match[1]) {
      const slug = match[1];
      if (!commitMessage) setCommitMessage(`feat: add solution for ${slug}`);
      if (!filePath) setFilePath(slug);
      
      if (!fileContent.includes(url)) {
        setFileContent(`// Problem: ${url}\n\n${fileContent}`);
      }
    }
  };

  useEffect(() => {
    if (!fileContent || !filePath) return;
    
    let ext = '';
    const contentToTest = fileContent.toLowerCase();
    
    // Basic heuristics to determine the extension from code syntax
    if (contentToTest.includes('public class ') || (contentToTest.includes('class solution') && contentToTest.includes('public'))) ext = '.java';
    else if (contentToTest.includes('def ') || contentToTest.includes('class solution:')) ext = '.py';
    else if (contentToTest.includes('function ') || contentToTest.includes('const ') || contentToTest.includes('let ')) ext = '.js';
    else if (contentToTest.includes('#include') || contentToTest.includes('using namespace std')) ext = '.cpp';
    else if (contentToTest.includes('package main') || contentToTest.includes('func ')) ext = '.go';
    else if (contentToTest.includes('impl solution') || contentToTest.includes('fn ')) ext = '.rs';
    
    if (ext) {
      const parts = filePath.split('/');
      const lastPart = parts.pop();
      const nameWithoutExt = lastPart.split('.')[0];
      
      // If we don't have an extension, or the current extension is not matching our inferred one
      if (nameWithoutExt && !lastPart.endsWith(ext)) {
        parts.push(`${nameWithoutExt}${ext}`);
        setFilePath(parts.join('/'));
      }
    }
  }, [fileContent, filePath]);

  const confirmPush = async () => {
    setStatus('loading');
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      };
      
      const body = {
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(fileContent))),
      };
      if (stagedSha) body.sha = stagedSha;

      const res = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
        { method: 'PUT', headers, body: JSON.stringify(body) }
      );

      if (res.ok) {
        setStatus('success');
        setStagedSha(null);
        setExistingCode('');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        const err = await res.json();
        alert('GitHub error: ' + (err.message || 'Unknown error'));
        setStatus('idle');
      }
    } catch (e) {
      alert('Push failed: ' + e.message);
      setStatus('idle');
    }
  };

  const handlePushClick = async () => {
    if (!token || !repoOwner || !repoName || !filePath || !commitMessage) {
      alert('Please fill in all fields before pushing.');
      return;
    }

    setStatus('loading');
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      };

      let sha = null;
      let existingText = '';
      try {
        const checkRes = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
          { headers }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          sha = existing.sha;
          existingText = decodeURIComponent(escape(atob(existing.content)));
        }
      } catch (_) { }

      if (sha) {
        setStagedSha(sha);
        setExistingCode(existingText);
        setStatus('confirming');
      } else {
        await confirmPush();
      }
    } catch (e) {
      alert('Operation failed: ' + e.message);
      setStatus('idle');
    }
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-stone-200 placeholder-stone-400 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all hover:bg-white/10 backdrop-blur-sm';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-stone-200 py-12 px-6 lg:px-12 relative overflow-hidden" data-color-mode="dark" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .diff-viewer {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 13px !important;
        }
        .w-tc-editor-text, .w-tc-editor-preview {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 13px !important;
          line-height: 1.6 !important;
        }
      `}</style>

      {/* Decorative blurred blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10 min-h-[calc(100vh-6rem)]">
        
        {/* Left Column - Copy & Features */}
        <div className="lg:col-span-5 flex flex-col lg:justify-start lg:self-start lg:mt-[68px]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium tracking-widest uppercase text-emerald-400 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sync Workflow
            </div>
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight text-white mb-4 leading-[1.1]">
              LeetCode to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                GitHub.
              </span>
            </h1>
            <p className="text-stone-400 text-lg leading-relaxed mb-6">
              Stop context switching. Push your DSA solutions and competitive programming answers directly to your repositories in seconds.
            </p>
          </div>

          <div className="space-y-5">
            {[
              { title: 'Zero Friction', desc: 'No need to clone repos, stage changes, or write terminal commands.' },
              { title: 'Smart Parsing', desc: 'Pasting a LeetCode URL auto-fills your fields and tags the file.' },
              { title: 'Rich Highlight', desc: 'Syntax highlighting detects Java, Python, TS, and more.' }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                  <h3 className="text-stone-200 font-medium mb-1">{feature.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - The Form or Diff Viewer */}
        <div className="lg:col-span-7">
          {status === 'confirming' ? (
            <div className="glass-panel text-white rounded-3xl p-8 lg:p-10 shadow-emerald-500/5 relative">
              <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50" />
              
              <h2 className="text-2xl font-semibold mb-2 text-amber-400">File Already Exists</h2>
              <p className="text-sm text-stone-400 mb-6">You are about to overwrite <strong className="text-stone-200">{filePath}</strong>. Please review the changes below.</p>
              
              <div className="rounded-xl overflow-hidden mb-8 border border-white/10 custom-scrollbar overflow-x-auto">
                <div className="diff-viewer bg-[#0d1117] pt-4">
                  <ReactDiffViewer 
                    oldValue={existingCode} 
                    newValue={fileContent} 
                    splitView={false} 
                    useDarkTheme={true}
                    leftTitle="Target Repository"
                    rightTitle="Your New Code"
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: 'transparent',
                          diffViewerColor: '#e2e8f0',
                          titleBackground: '#161b22',
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setStatus('idle')} 
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 text-stone-300 rounded-xl hover:bg-white/10 hover:text-white transition font-medium"
                >
                  Cancel Operation
                </button>
                <button 
                  onClick={confirmPush} 
                  className="flex-1 py-3.5 bg-amber-500 text-stone-900 rounded-xl hover:bg-amber-400 transition font-bold shadow-lg shadow-amber-500/20"
                >
                  Confirm Overwrite
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-8 lg:p-10 shadow-2xl relative">
              
              {/* Top decorative bar */}
              <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />

              {/* Auth Section */}
              <div className="mb-6 group">
                <label className="flex items-center justify-between text-sm font-medium text-stone-400 mb-2">
                  <span>Personal Access Token</span>
                  <a href="https://docs.github.com/en/authentication" target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
                    Find your token ↗
                  </a>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={handleTokenChange}
                    className={inputClass}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-stone-800/50 text-stone-400 border border-white/5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/5 my-6" />

              {/* Repository & Paths */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">GitHub Username</label>
                  <input
                    type="text"
                    placeholder="octocat"
                    value={repoOwner}
                    onChange={handleOwnerChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-2">Target Repository</label>
                  {repos.length > 0 ? (
                    <select
                      value={repoName}
                      onChange={handleRepoChange}
                      className={inputClass}
                    >
                      <option value="" disabled>Select a repository...</option>
                      {repos.map(r => (
                        <option key={r} value={r} className="bg-stone-900 text-stone-200 border-none">{r}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="algorithms-practice"
                      value={repoName}
                      onChange={handleRepoChange}
                      className={inputClass}
                    />
                  )}
                </div>
              </div>

              <div className="mb-5 relative">
                <label className="flex items-center justify-between text-sm font-medium text-stone-400 mb-2">
                  <span>LeetCode URL <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded tracking-wide uppercase">Auto-fills</span></span>
                </label>
                <input
                  type="text"
                  placeholder="https://leetcode.com/problems/..."
                  value={leetCodeUrl}
                  onChange={handleUrlChange}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-stone-400 mb-2">File Path</label>
                  <input
                    type="text"
                    placeholder="two-sum.js"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-stone-400 mb-2">Commit Message</label>
                  <input
                    type="text"
                    placeholder="feat: two-sum optimal approach"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Code Editor */}
              <div className="mb-6">
                <label className="flex items-center justify-between text-sm font-medium text-stone-400 mb-2">
                  <span>Solution Code</span>
                </label>
                <div className="relative group overflow-hidden rounded-xl border border-white/10 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <div className="max-h-[300px] overflow-y-auto bg-[#0d1117] custom-scrollbar">
                    <CodeEditor
                      value={fileContent}
                      language={filePath.split('.').pop() || "js"}
                      placeholder="Paste your solution here..."
                      onChange={(evn) => setFileContent(evn.target.value)}
                      padding={16}
                      minHeight={150}
                      style={{
                        backgroundColor: "transparent",
                      }}
                    />
                  </div>
                  
                  {/* Simulated IDE dots */}
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-500"></div>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePushClick}
                disabled={status === 'loading'}
                className={`w-full group relative overflow-hidden rounded-xl font-medium text-sm py-4 transition-all duration-300
                  ${status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                  : 'bg-white text-black hover:bg-stone-200 active:scale-[0.98]'}
                  ${status === 'loading' && 'opacity-70 cursor-wait'}
                `}
              >
                <div className="relative flex items-center justify-center gap-2 z-10">
                  {status === 'loading' && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {status === 'loading' && 'Syncing...'}
                  
                  {status === 'success' && '✓ Synced Successfully!'}
                  
                  {status === 'idle' && (
                    <>
                      <span>Commit & Push Solution</span>
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </>
                  )}
                </div>

                {/* Button hover gradient */}
                {status === 'idle' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                )}
              </button>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;