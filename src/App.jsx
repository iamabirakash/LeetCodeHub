import React, { useState, useEffect } from 'react';
import { Octokit } from '@octokit/rest';
import './App.css';

const App = () => {
  const [fileContent, setFileContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [token, setToken] = useState(localStorage.getItem('githubToken') || '');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('githubToken');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleTokenChange = (e) => {
    const newToken = e.target.value;
    setToken(newToken);
    localStorage.setItem('githubToken', newToken);
  };

  const handlePush = async () => {
    const octokit = new Octokit({ auth: token });

    try {
      // Get the current content of the file (if it exists) to get the SHA
      let sha;
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: filePath,
        });
        sha = existingFile.sha;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      // Create or update the file
      await octokit.repos.createOrUpdateFileContents({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
        message: commitMessage,
        content: btoa(fileContent),
        sha,
      });

      alert('File pushed successfully!');
    } catch (error) {
      console.error('Error pushing file:', error);
      alert('Failed to push the file.');
    }
  };

  return (
    <>
      <div className='tracking-tighter mt-20 grid justify-center items-center text-center sm:text-centre'>
        <h1 className='start text-[6vw] '>LeetCode to GitHub</h1>
        <p className='start grid text-muted-foreground justify-center items-center'>Push your Leetcode Solutions directly to your Github repository.</p>
      </div>
      <div className="text-xl mt-4 p-10 border-spacing-0 grid items-center">
        <div className='grid mb-2 sm:w-full md:w-full lg:w-1/2'>
          <label className='bold hover:text-blue-500'><a href="https://www.geeksforgeeks.org/how-to-generate-personal-access-token-in-github/">GitHub Personal Access Token: </a></label>
          <input
            className='h-10 w-full px-3 py-3 my-2 rounded-xl outline outline-offset-0 text-black'
            placeholder='Enter your Github Personal Access Token'
            type="password"
            value={token}
            onChange={handleTokenChange}
          />
        </div>
        <div className="grid mb-2 sm:w-full md:w-full lg:w-1/2">
          <label className='bold'>Enter Github Username: </label>
          <input
            className='h-10 w-full rounded-xl px-3 py-3 my-2 outline outline-offset-0 text-black'
            type="text"
            placeholder='Enter your Github Username'
            value={repoOwner}
            onChange={(e) => setRepoOwner(e.target.value)}
          />
        </div>
        <div className="grid mb-2 sm:w-full md:w-full lg:w-1/2">
          <label className='bold'>Repository Name:</label>
          <input
            className='h-10 w-full rounded-xl px-3 py-3 my-2 outline outline-offset-0 text-black'
            placeholder='Enter your Github Repository Name'
            type="text"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
          />
        </div>
        <div className="grid mb-2 sm:w-full md:w-full lg:w-1/2">
          <label>File Path (e.g., solutions/solution1.java):</label>
          <input
            className='h-10 rounded-xl px-3 py-3 my-2 outline outline-offset-0 text-black'
            placeholder='Enter your file path from Repository (solutions/solutions.java)'
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
          />
        </div>
        <div className="grid mb-2 sm:w-full md:w-full lg:w-1/2">
          <label className='bold'>Commit Message:</label>
          <input
            className='h-10 w-full rounded-xl px-3 py-3 my-2 outline outline-offset-0 text-black'
            placeholder='Enter your Commit Message'
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
        </div>
        <div className="grid mb-2 sm:w-full md:w-full lg:w-1/2">
          <label className='bold'>File Content:</label>
          <textarea
            className='h-80 w-full rounded-xl px-3 py-3 my-2 outline outline-offset-0 text-black'
            placeholder='Enter your Code/Text'
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
          />
        </div>
        <div className='relative left-1/2 -translate-x-[50%] grid justify-center items-center bg-yellow-500 rounded-xl text-black w-40 tracking-tighter'>
          <button onClick={handlePush}>Push to GitHub</button>
        </div>
      </div>
    </>
  );
};

export default App;
