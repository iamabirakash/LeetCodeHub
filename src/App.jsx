import React, { useState, useEffect } from 'react';

const App = () => {
  const [fileContent, setFileContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [token, setToken] = useState('');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success

  useEffect(() => {
    const savedToken = localStorage.getItem('githubToken');
    if (savedToken) setToken(savedToken);
  }, []);

  const handleTokenChange = (e) => {
    setToken(e.target.value);
    localStorage.setItem('githubToken', e.target.value);
  };

  const handlePush = async () => {
    if (!token || !repoOwner || !repoName || !filePath || !commitMessage) {
      alert('Please fill in all fields before pushing.');
      return;
    }

    setStatus('loading');

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      };

      let sha;
      try {
        const checkRes = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
          { headers }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          sha = existing.sha;
        }
      } catch (_) { }

      const body = {
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(fileContent))),
      };
      if (sha) body.sha = sha;

      const res = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
        { method: 'PUT', headers, body: JSON.stringify(body) }
      );

      if (res.ok) {
        setStatus('success');
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

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all hover:bg-white/10 backdrop-blur-sm';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-stone-200 py-12 px-6 lg:px-12 relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
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
          width: 6px;
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
      `}</style>

      {/* Decorative blurred blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center relative z-10 min-h-[calc(100vh-6rem)]">

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
              { title: 'Organized History', desc: 'Keep your GitHub activity graph green and your code neatly categorized.' },
              { title: 'Secure Locally', desc: 'Your Personal Access Token stays safely encoded in your own browser.' }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div>
                  <h3 className="text-stone-200 font-medium mb-1">{feature.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - The Form */}
        <div className="lg:col-span-7">
          <div className="glass-panel rounded-3xl p-8 lg:p-10 shadow-2xl relative">

            {/* Top decorative bar */}
            <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />

            {/* Auth Section */}
            <div className="mb-6 group">
              <label className="flex items-center justify-between text-sm font-medium text-stone-400 mb-2">
                <span>GitHub PAT</span>
                <a href="https://docs.github.com/en/authentication" target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
                  Need a token? ↗
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-stone-800/50 text-stone-400 border border-white/5 group-hover:border-emerald-500/30 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-2">Username</label>
                <input
                  type="text"
                  placeholder="octocat"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-2">Repository</label>
                <input
                  type="text"
                  placeholder="algorithms-practice"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-400 mb-2">Target File Path</label>
              <input
                type="text"
                placeholder="arrays/two-sum.js"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-400 mb-2">Commit Message</label>
              <input
                type="text"
                placeholder="feat: optimal solution for two-sum (O(n))"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-400 mb-2">Solution Code</label>
              <div className="relative group">
                <textarea
                  placeholder="// Paste your formatted solution here... &#10;function twoSum(nums, target) { ... }"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  rows={8}
                  className={`${inputClass} font-['JetBrains_Mono'] text-[13px] leading-relaxed resize-none custom-scrollbar`}
                />

                {/* Simulated IDE dots */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-500"></div>
                </div>
              </div>
            </div>

            <button
              onClick={handlePush}
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
                {status === 'loading' && 'Syncing to GitHub...'}

                {status === 'success' && '✓ Synced Successfully!'}

                {status === 'idle' && (
                  <>
                    <span>Commit & Push Solution</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
        </div>
      </div>
    </div>
  );
};

export default App;