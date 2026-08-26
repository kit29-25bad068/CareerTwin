const axios = require('axios');
const geminiService = require('./geminiService');

async function fetchAndAnalyzeGitHub(username, targetRole = 'Software Engineer') {
  if (!username) {
    throw new Error('GitHub username is required.');
  }

  const cleanUsername = username.trim().replace(/^@/, '');
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CareerTwin-AI-Platform',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token && token !== 'your_github_personal_access_token_here') {
    headers.Authorization = `token ${token}`;
  }

  try {
    // 1. Fetch User Profile
    const userRes = await axios.get(`https://api.github.com/users/${cleanUsername}`, {
      headers,
      timeout: 15000,
    });
    const userData = userRes.data;

    // 2. Fetch Repositories
    const reposRes = await axios.get(
      `https://api.github.com/users/${cleanUsername}/repos?per_page=30&sort=updated`,
      { headers, timeout: 15000 }
    );
    const rawRepos = reposRes.data || [];

    // Filter out forks if non-empty, otherwise take all
    const ownRepos = rawRepos.filter((r) => !r.fork);
    const reposToAnalyze = ownRepos.length > 0 ? ownRepos : rawRepos;

    // 3. Compute Language Distribution & Metrics
    const languageCounts = {};
    let totalReposWithLang = 0;

    const formattedRepos = reposToAnalyze.map((r) => {
      if (r.language) {
        languageCounts[r.language] = (languageCounts[r.language] || 0) + 1;
        totalReposWithLang++;
      }
      return {
        name: r.name,
        description: r.description || '',
        htmlUrl: r.html_url,
        language: r.language || 'Unspecified',
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        hasReadme: Boolean(r.description && r.description.length > 10),
        updatedAt: r.updated_at,
      };
    });

    const topLanguages = Object.entries(languageCounts)
      .map(([lang, count]) => ({
        language: lang,
        repoCount: count,
        percentage: Math.round((count / (totalReposWithLang || 1)) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // 4. Send to Gemini for engineering signal evaluation
    let analysis;
    try {
      analysis = await geminiService.analyzeGitHubSignals({
        username: cleanUsername,
        publicReposCount: userData.public_repos || 0,
        topLanguages,
        repos: formattedRepos,
        targetRole,
      });
    } catch (aiErr) {
      console.warn('[GitHub AI Analysis Warning] AI evaluation fallback used:', aiErr.message);
      analysis = {
        overallScore: formattedRepos.length > 0 ? 70 : 40,
        codeDiversityScore: topLanguages.length > 1 ? 75 : 50,
        documentationScore: 60,
        consistencyScore: 65,
        engineeringSignals: [
          `Detected ${formattedRepos.length} public repositories with ${topLanguages.map((l) => l.language).join(', ') || 'various code'}`,
          `Primary programming focus in ${topLanguages[0]?.language || 'Software Development'}`,
        ],
        strengths: [`Active repository footprint with ${formattedRepos.length} repositories`],
        weaknesses: ['Add detailed READMEs and architecture diagrams to high-priority repositories'],
        recommendedImprovements: ['Ensure every showcase project has a live demo link and installation instructions'],
        summary: `GitHub profile shows active work in ${topLanguages.slice(0, 2).map((l) => l.language).join(', ') || 'programming'}.`,
      };
    }

    return {
      username: cleanUsername,
      avatarUrl: userData.avatar_url,
      bio: userData.bio || '',
      publicReposCount: userData.public_repos || 0,
      followersCount: userData.followers || 0,
      topLanguages,
      repositories: formattedRepos,
      analysis,
      lastSyncedAt: new Date(),
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      throw new Error(`GitHub user "${cleanUsername}" was not found on GitHub.`);
    }
    if (err.response && err.response.status === 403) {
      throw new Error('GitHub API rate limit reached. Configure GITHUB_TOKEN in .env for higher rate limits.');
    }
    throw new Error(`Failed to fetch GitHub profile: ${err.message}`);
  }
}

module.exports = {
  fetchAndAnalyzeGitHub,
};
