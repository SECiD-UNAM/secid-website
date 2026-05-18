import type { ProjectShowcase } from '@/types/member';

export interface GitHubRepository {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics?: string[];
  stargazers_count?: number;
  updated_at: string;
}

export function extractGitHubUsername(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  try {
    if (!value.includes('://') && !value.startsWith('github.com/')) {
      return /^[a-zA-Z0-9-]+$/.test(value) ? value : null;
    }

    const normalized = value.includes('://') ? value : `https://${value}`;
    const url = new URL(normalized);

    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;

    const username = url.pathname.split('/').filter(Boolean)[0];
    if (!username) return null;

    return /^[a-zA-Z0-9-]+$/.test(username) ? username : null;
  } catch {
    return null;
  }
}

export async function fetchGitHubRepositories(
  username: string,
  limit = 6
): Promise<GitHubRepository[]> {
  const response = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${limit}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('rate_limited');
    }
    if (response.status === 404) {
      throw new Error('user_not_found');
    }
    throw new Error('fetch_failed');
  }

  return (await response.json()) as GitHubRepository[];
}

export function mapGitHubRepositoryToProject(
  repo: GitHubRepository
): ProjectShowcase {
  const technologies = Array.from(
    new Set([repo.language, ...(repo.topics || [])].filter(Boolean))
  ) as string[];

  return {
    id: `github-${repo.id}`,
    title: repo.name,
    description: repo.description || '',
    technologies,
    githubUrl: repo.html_url,
    category: 'other',
    featured: (repo.stargazers_count || 0) >= 10,
    createdAt: new Date(repo.updated_at),
  };
}
