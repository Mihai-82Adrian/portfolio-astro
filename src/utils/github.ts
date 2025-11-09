/**
 * GitHub API Utility
 * Fetches GitHub profile statistics with caching support
 */

export interface GitHubStats {
  totalRepos: number;
  publicRepos: number;
  privateRepos: number;
  languages: { name: string; percentage: number; color: string }[];
  recentActivity: {
    type: string;
    repo: string;
    date: string;
    message?: string;
  }[];
  profile: {
    name: string;
    bio: string;
    followers: number;
    following: number;
    avatar: string;
    url: string;
  };
}

// Language colors from GitHub
const LANGUAGE_COLORS: Record<string, string> = {
  Rust: '#dea584',
  Julia: '#a270ba',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  Vue: '#41b883',
  C: '#555555',
  'C++': '#f34b7d',
  Java: '#b07219',
  Go: '#00ADD8',
  PHP: '#4F5D95',
};

// Cache configuration
const CACHE_KEY = 'github_stats_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface CacheEntry {
  data: GitHubStats;
  timestamp: number;
}

/**
 * Get GitHub stats from cache or fetch fresh data
 */
export async function getGitHubStats(username: string): Promise<GitHubStats | null> {
  // Check cache first (only in browser)
  if (typeof window !== 'undefined') {
    const cached = getCachedStats();
    if (cached) {
      return cached;
    }
  }

  try {
    // Fetch user profile
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch GitHub user:', userResponse.status);
      return getFallbackStats();
    }

    const userData = await userResponse.json();

    // Fetch repositories
    const reposResponse = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!reposResponse.ok) {
      console.error('Failed to fetch GitHub repos:', reposResponse.status);
      return getFallbackStats();
    }

    const repos = await reposResponse.json();

    // Calculate language statistics
    const languageStats: Record<string, number> = {};
    let totalSize = 0;

    repos.forEach((repo: any) => {
      if (repo.language) {
        languageStats[repo.language] = (languageStats[repo.language] || 0) + (repo.size || 0);
        totalSize += repo.size || 0;
      }
    });

    // Convert to percentage and sort
    const languages = Object.entries(languageStats)
      .map(([name, size]) => ({
        name,
        percentage: Math.round((size / totalSize) * 100),
        color: LANGUAGE_COLORS[name] || '#8b949e',
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5); // Top 5 languages

    // Fetch recent activity (events)
    const eventsResponse = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=5`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    let recentActivity: any[] = [];
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      recentActivity = events.slice(0, 5).map((event: any) => ({
        type: event.type,
        repo: event.repo.name,
        date: event.created_at,
        message: event.payload?.commits?.[0]?.message || undefined,
      }));
    }

    const stats: GitHubStats = {
      totalRepos: userData.public_repos + (userData.total_private_repos || 0),
      publicRepos: userData.public_repos,
      privateRepos: userData.total_private_repos || 0,
      languages,
      recentActivity,
      profile: {
        name: userData.name || username,
        bio: userData.bio || '',
        followers: userData.followers,
        following: userData.following,
        avatar: userData.avatar_url,
        url: userData.html_url,
      },
    };

    // Cache the results (only in browser)
    if (typeof window !== 'undefined') {
      cacheStats(stats);
    }

    return stats;
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    return getFallbackStats();
  }
}

/**
 * Get cached stats if available and not expired
 */
function getCachedStats(): GitHubStats | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - entry.timestamp < CACHE_DURATION) {
      return entry.data;
    }

    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error('Error reading GitHub stats cache:', error);
    return null;
  }
}

/**
 * Cache stats to localStorage
 */
function cacheStats(stats: GitHubStats): void {
  try {
    const entry: CacheEntry = {
      data: stats,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.error('Error caching GitHub stats:', error);
  }
}

/**
 * Fallback stats when API fails or during build
 */
function getFallbackStats(): GitHubStats {
  return {
    totalRepos: 13,
    publicRepos: 4,
    privateRepos: 9,
    languages: [
      { name: 'Rust', percentage: 35, color: '#dea584' },
      { name: 'Julia', percentage: 25, color: '#a270ba' },
      { name: 'TypeScript', percentage: 20, color: '#3178c6' },
      { name: 'Python', percentage: 12, color: '#3572A5' },
      { name: 'JavaScript', percentage: 8, color: '#f1e05a' },
    ],
    recentActivity: [],
    profile: {
      name: 'Mihai Adrian Mateescu',
      bio: 'AI Research & Cognitive Computing',
      followers: 0,
      following: 0,
      avatar: '/images/me.jpg',
      url: 'https://github.com/Mihai-82Adrian',
    },
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Format event type for display
 */
export function formatEventType(type: string): string {
  const typeMap: Record<string, string> = {
    PushEvent: 'Pushed to',
    CreateEvent: 'Created',
    DeleteEvent: 'Deleted',
    ForkEvent: 'Forked',
    WatchEvent: 'Starred',
    IssuesEvent: 'Issue',
    PullRequestEvent: 'Pull Request',
    ReleaseEvent: 'Released',
  };
  return typeMap[type] || type;
}
