import { describe, it, expect } from 'vitest';
import {
  extractGitHubUsername,
  mapGitHubRepositoryToProject,
} from '@/lib/github-projects';

describe('extractGitHubUsername', () => {
  it('extracts username from full github url', () => {
    expect(extractGitHubUsername('https://github.com/octocat')).toBe('octocat');
  });

  it('extracts username from github.com path without scheme', () => {
    expect(extractGitHubUsername('github.com/octocat')).toBe('octocat');
  });

  it('accepts plain username', () => {
    expect(extractGitHubUsername('octo-cat')).toBe('octo-cat');
  });

  it('returns null for invalid domains', () => {
    expect(extractGitHubUsername('https://example.com/octocat')).toBeNull();
  });
});

describe('mapGitHubRepositoryToProject', () => {
  it('maps repository payload into project showcase shape', () => {
    const project = mapGitHubRepositoryToProject({
      id: 12,
      name: 'repo',
      description: 'demo repo',
      html_url: 'https://github.com/octocat/repo',
      language: 'TypeScript',
      topics: ['web', 'ml'],
      stargazers_count: 12,
      updated_at: '2026-03-20T12:00:00.000Z',
    });

    expect(project.id).toBe('github-12');
    expect(project.title).toBe('repo');
    expect(project.githubUrl).toBe('https://github.com/octocat/repo');
    expect(project.technologies).toContain('TypeScript');
    expect(project.featured).toBe(true);
  });
});
