import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// Load from environment variables (provided by GitHub Actions)
const LEETCODE_SESSION = process.env.LEETCODE_SESSION;
const REPO_OWNER = process.env.GITHUB_REPOSITORY_OWNER || 'YourGitHubUsername';

if (!LEETCODE_SESSION) {
  console.error("Missing LEETCODE_SESSION environment variable");
  process.exit(1);
}

const STATE_FILE = path.join(process.cwd(), 'sync', 'sync_state.json');
const README_FILE = path.join(process.cwd(), 'README.md');

// Helper to wait
const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchRecentAcSubmissions() {
  const query = `
    query recentAcSubmissions {
      recentAcSubmissionList(limit: 15) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `LEETCODE_SESSION=${LEETCODE_SESSION}`
    },
    body: JSON.stringify({ query, variables: {} })
  });

  const data = await res.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.data.recentAcSubmissionList || [];
}

async function fetchSubmissionDetails(submissionId) {
  const query = `
    query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        code
        lang {
          name
        }
        question {
          questionId
          title
          titleSlug
          topicTags {
            name
          }
        }
      }
    }
  `;

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `LEETCODE_SESSION=${LEETCODE_SESSION}`
    },
    body: JSON.stringify({ query, variables: { submissionId: parseInt(submissionId) } })
  });

  const data = await res.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.data.submissionDetails;
}

// Same logic you had in your React App
function buildUpdatedRootReadme(existingContent, { slug, title, tags, owner }) {
  const toAnchor = (tag) => tag.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]/g, '');

  if (!existingContent || !existingContent.trim()) {
    let content = `# Leetcode\\n${owner}\\n\\nA topic-wise index of the solution folders in this repository. Some problems appear in multiple sections when they naturally fit more than one pattern.\\n\\n## Topics\\n`;
    for (const tag of tags) {
      content += `- [${tag}](#${toAnchor(tag)}) (1)\\n`;
    }
    content += '\\n---\\n';
    for (const tag of tags) {
      content += `\\n## ${tag}\\n1. [${title}](${slug}/)\\n`;
    }
    return content;
  }

  let lines = existingContent.split('\\n');

  for (const tag of tags) {
    const sectionHeader = `## ${tag}`;
    const sectionIndex = lines.findIndex(l => l.trim() === sectionHeader);

    if (sectionIndex !== -1) {
      let listEnd = sectionIndex + 1;
      let hasDuplicate = false;
      let itemCount = 0;

      while (listEnd < lines.length) {
        const trimmed = lines[listEnd].trim();
        if (trimmed.startsWith('## ') || trimmed === '---') break;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\\d+\\.\\s/.test(trimmed)) {
          itemCount++;
          if (trimmed.includes(`(${slug}/)`)) {
            hasDuplicate = true;
          }
        }
        listEnd++;
      }

      if (!hasDuplicate) {
        const newEntry = `${itemCount + 1}. [${title}](${slug}/)`;
        lines.splice(listEnd, 0, newEntry);
        itemCount++;
      }

      const anchor = toAnchor(tag);
      const topicsEntryRegex = new RegExp(`^(\\s*-\\s*\\[${tag.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\]\\(#${anchor}\\))\\s*\\(\\d+\\)`, 'i');
      for (let i = 0; i < lines.length; i++) {
        if (topicsEntryRegex.test(lines[i])) {
          lines[i] = lines[i].replace(/\\(\\d+\\)/, `(${itemCount})`);
          break;
        }
      }
    } else {
      const newEntry = `1. [${title}](${slug}/)`;
      lines.push('', sectionHeader, newEntry);

      const topicsHeaderIdx = lines.findIndex(l => l.trim() === '## Topics');
      if (topicsHeaderIdx !== -1) {
        let topicsEnd = topicsHeaderIdx + 1;
        while (topicsEnd < lines.length) {
          const trimmed = lines[topicsEnd].trim();
          if (trimmed === '' || trimmed === '---' || trimmed.startsWith('## ')) break;
          topicsEnd++;
        }
        lines.splice(topicsEnd, 0, `- [${tag}](#${toAnchor(tag)}) (1)`);
      }
    }
  }

  return lines.join('\\n');
}

const getExtension = (langName) => {
  const map = {
    'python': 'py',
    'python3': 'py',
    'cpp': 'cpp',
    'java': 'java',
    'javascript': 'js',
    'typescript': 'ts',
    'golang': 'go',
    'rust': 'rs',
    'c': 'c',
    'csharp': 'cs',
    'sql': 'sql',
    'mysql': 'sql',
    'postgresql': 'sql',
    'mssql': 'sql',
    'ms sql server': 'sql',
    'oracle': 'sql',
    'oracle sql': 'sql',
  };
  return map[langName.toLowerCase()] || 'txt';
};

async function main() {
  console.log("Fetching recent submissions...");
  let state = { lastSyncTimestamp: 0 };
  try {
    const stateRaw = await fs.readFile(STATE_FILE, 'utf8');
    state = JSON.parse(stateRaw);
  } catch (e) {
    console.log("No previous state found, starting fresh.");
  }

  const recent = await fetchRecentAcSubmissions();
  
  // Filter new ones
  const newSubmissions = recent.filter(sub => parseInt(sub.timestamp) > state.lastSyncTimestamp);
  
  if (newSubmissions.length === 0) {
    console.log("No new accepted submissions found.");
    return;
  }

  // Sort oldest first to process in chronological order
  newSubmissions.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

  for (const sub of newSubmissions) {
    console.log(`Processing ${sub.titleSlug}...`);
    try {
      const details = await fetchSubmissionDetails(sub.id);
      if (!details || !details.question) {
         console.error(`Failed to get details for ${sub.titleSlug}`);
         continue;
      }
      
      const { code, lang, question } = details;
      const { title, titleSlug, topicTags } = question;
      const tags = topicTags.map(t => t.name);

      // Create folder
      const problemDir = path.join(process.cwd(), titleSlug);
      await fs.mkdir(problemDir, { recursive: true });

      // Write code file
      const ext = getExtension(lang.name);
      const codePath = path.join(problemDir, `solution.${ext}`);
      await fs.writeFile(codePath, code, 'utf8');

      // Write problem README
      // (Fetching full HTML description could be done via Alfa API, but here we just create a stub to avoid rate limits, or we use LeetCode GraphQL again)
      const problemReadmePath = path.join(problemDir, `README.md`);
      const problemReadmeContent = `# ${title}\\n\\n**Problem Link:** [https://leetcode.com/problems/${titleSlug}](https://leetcode.com/problems/${titleSlug})\\n\\n*Auto-synced via GitHub Actions.*`;
      await fs.writeFile(problemReadmePath, problemReadmeContent, 'utf8');

      // Update Root README
      let rootReadme = '';
      try {
        rootReadme = await fs.readFile(README_FILE, 'utf8');
      } catch (e) {}

      const updatedRootReadme = buildUpdatedRootReadme(rootReadme, {
        slug: titleSlug,
        title: title,
        tags: tags,
        owner: REPO_OWNER
      });

      await fs.writeFile(README_FILE, updatedRootReadme, 'utf8');

      // Update State
      state.lastSyncTimestamp = parseInt(sub.timestamp);
      await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
      
      console.log(`Successfully synced ${titleSlug}`);

      // Don't hammer the API
      await delay(2000);

    } catch (err) {
      console.error(`Error processing ${sub.titleSlug}:`, err);
    }
  }
}

main().catch(err => {
  console.error("Fatal error during sync:", err);
  process.exit(1);
});
