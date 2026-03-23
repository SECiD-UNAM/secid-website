import React, { useState, useEffect } from 'react';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  helpful: number;
  notHelpful: number;
  views: number;
}

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  articleCount: number;
}

interface HelpCenterProps {
  className?: string;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<
    Record<string, 'helpful' | 'not-helpful' | null>
  >({});

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockCategories: HelpCategory[] = [
      {
        id: 'getting-started',
        name: 'Getting Started',
        description: 'Learn the basics of using the SECiD platform',
        icon: '🚀',
        articleCount: 8,
      },
      {
        id: 'profile',
        name: 'Profile & Settings',
        description: 'Manage your profile and account preferences',
        icon: '👤',
        articleCount: 12,
      },
      {
        id: 'jobs',
        name: 'Job Search & Applications',
        description: 'Find and apply to job opportunities',
        icon: '💼',
        articleCount: 15,
      },
      {
        id: 'networking',
        name: 'Networking',
        description: 'Connect with other data science professionals',
        icon: '🤝',
        articleCount: 10,
      },
      {
        id: 'events',
        name: 'Events',
        description: 'Discover and attend community events',
        icon: '📅',
        articleCount: 7,
      },
      {
        id: 'gamification',
        name: 'Points & Badges',
        description: 'Understand the gamification system',
        icon: '🏆',
        articleCount: 6,
      },
      {
        id: 'troubleshooting',
        name: 'Troubleshooting',
        description: 'Solve common issues and technical problems',
        icon: '🔧',
        articleCount: 9,
      },
      {
        id: 'privacy',
        name: 'Privacy & Security',
        description: 'Learn about data protection and security features',
        icon: '🔒',
        articleCount: 5,
      },
    ];

    const mockArticles: HelpArticle[] = [
      {
        id: 'welcome-guide',
        title: 'Welcome to SECiD - Your Complete Getting Started Guide',
        content: `
# Welcome to SECiD!

Welcome to the Sociedad de Egresados en Ciencia de Datos (SECiD) platform! This guide will help you get started and make the most of your membership.

## What is SECiD?

SECiD is a professional community for data science graduates from UNAM. Our platform connects alumni, facilitates networking, provides job opportunities, and supports continuous learning.

## Getting Started

### 1. Complete Your Profile
- Add your professional information
- Upload a professional photo
- List your skills and specializations
- Include links to your LinkedIn, GitHub, and portfolio

### 2. Explore the Platform
- Browse job opportunities
- Join relevant discussions in the forum
- Discover upcoming events
- Connect with other members

### 3. Engage with the Community
- Participate in discussions
- Attend virtual and in-person events
- Share knowledge and resources
- Mentor fellow members

## Key Features

### Job Board
Find opportunities from companies looking specifically for data science talent.

### Networking
Connect with alumni working in various industries and roles.

### Events
Attend workshops, webinars, and networking events.

### Forums
Engage in technical discussions and share insights.

### Gamification
Earn points and badges for active participation.

## Getting Help

If you need assistance:
- Check this help center
- Contact our support team
- Join the "Help & Support" forum
- Attend our monthly Q&A sessions

Welcome to the community! 🎉
        `,
        category: 'getting-started',
        tags: ['welcome', 'basics', 'overview'],
        lastUpdated: '2024-01-15',
        helpful: 42,
        notHelpful: 3,
        views: 156,
      },
      {
        id: 'profile-optimization',
        title: 'How to Optimize Your Profile for Maximum Visibility',
        content: `
# Optimizing Your SECiD Profile

A well-optimized profile increases your visibility to potential employers and collaborators.

## Profile Completeness

### Essential Information
- **Professional Photo**: Use a high-quality, professional headshot
- **Headline**: Craft a compelling professional headline
- **Bio**: Write a concise summary of your background and goals
- **Skills**: List your technical and soft skills
- **Experience**: Add your work history and projects

### Optional but Recommended
- **Certifications**: Include relevant certifications
- **Education**: Add your academic background
- **Languages**: List languages you speak
- **Interests**: Share your professional interests

## Best Practices

### Photo Guidelines
- Use a recent, professional photo
- Ensure good lighting and quality
- Dress professionally
- Smile and look approachable

### Writing Your Bio
- Keep it concise (2-3 paragraphs)
- Highlight your unique value proposition
- Include your current role or career goals
- Use keywords relevant to your field

### Skills Section
- Include both technical and soft skills
- Be specific (e.g., "Python for Machine Learning" vs "Python")
- Update regularly as you learn new skills
- Prioritize skills most relevant to your career goals

## Visibility Tips

- Complete all profile sections
- Keep information current
- Engage actively on the platform
- Share insights and contribute to discussions
- Attend events and network with members

Remember: Your profile is your professional brand on SECiD!
        `,
        category: 'profile',
        tags: ['profile', 'optimization', 'visibility', 'networking'],
        lastUpdated: '2024-01-12',
        helpful: 38,
        notHelpful: 2,
        views: 124,
      },
      {
        id: 'job-search-tips',
        title: 'Effective Job Search Strategies on SECiD',
        content: `
# Mastering Job Search on SECiD

## Setting Up Job Alerts

### Custom Filters
- Set location preferences
- Choose experience levels
- Select job types (full-time, part-time, remote)
- Filter by skills and technologies

### Alert Frequency
- Daily alerts for active job seekers
- Weekly summaries for passive candidates
- Real-time notifications for urgent opportunities

## Application Best Practices

### Before Applying
- Research the company thoroughly
- Tailor your application to the specific role
- Review the job requirements carefully
- Check if you have connections at the company

### Application Materials
- **Resume**: Customize for each application
- **Cover Letter**: Address specific requirements
- **Portfolio**: Include relevant projects
- **References**: Prepare professional references

### Follow-Up Strategy
- Send thank-you notes after interviews
- Follow up appropriately after applications
- Connect with hiring managers on professional networks
- Stay engaged with companies of interest

## Leveraging SECiD Network

### Internal Referrals
- Connect with employees at target companies
- Ask for informational interviews
- Seek advice from industry professionals
- Request referrals when appropriate

### Community Support
- Share job search updates in forums
- Ask for feedback on applications
- Practice interviews with community members
- Learn from others' experiences

## Common Mistakes to Avoid

- Applying to every job without customization
- Neglecting to follow application instructions
- Sending generic cover letters
- Failing to prepare for interviews
- Not following up appropriately

## Success Metrics

Track your job search progress:
- Applications submitted
- Response rates
- Interview conversion rates
- Networking connections made
- Skill development activities

Remember: Job searching is a skill that improves with practice!
        `,
        category: 'jobs',
        tags: ['job-search', 'applications', 'career', 'networking'],
        lastUpdated: '2024-01-10',
        helpful: 51,
        notHelpful: 4,
        views: 203,
      },
    ];

    setCategories(mockCategories);
    setArticles(mockArticles);
    setLoading(false);
  }, []);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      !selectedCategory || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleFeedback = (
    articleId: string,
    type: 'helpful' | 'not-helpful'
  ) => {
    setFeedback((prev) => ({
      ...prev,
      [articleId]: type,
    }));

    // Here you would typically send feedback to your analytics service
    console.log(`Feedback for article ${articleId}: ${type}`);
  };

  const renderArticleView = () => {
    const article = articles.find((a) => a.id === selectedArticle);
    if (!article) return null;

    return (
      <div className="mx-auto max-w-4xl">
        {/* Back button */}
        <button
          onClick={() => setSelectedArticle(null)}
          className="mb-6 flex items-center text-blue-600 transition-colors hover:text-blue-800"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Help Center
        </button>

        {/* Article header */}
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold text-gray-900">
            {article.title}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              Updated: {new Date(article.lastUpdated).toLocaleDateString()}
            </span>
            <span>•</span>
            <span>{article.views} views</span>
            <span>•</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
              {categories.find((c) => c.id === article.category)?.name}
            </span>
          </div>
        </div>

        {/* Article content */}
        <div className="prose prose-lg mb-8 max-w-none">
          <div
            dangerouslySetInnerHTML={{
              __html: article.content
                .replace(/\n/g, '<br>')
                .replace(/#{1,6}\s/g, '<h3>')
                .replace(
                  /<h3>/g,
                  '<h3 class="text-xl font-semibold mt-6 mb-3">'
                ),
            }}
          />
        </div>

        {/* Article feedback */}
        <div className="border-t pt-8">
          <h3 className="mb-4 text-lg font-semibold">
            Was this article helpful?
          </h3>
          <div className="mb-6 flex items-center space-x-4">
            <button
              onClick={() => handleFeedback(article.id, 'helpful')}
              className={`
                flex items-center space-x-2 rounded-md border px-4 py-2 transition-colors
                ${
                  feedback[article.id] === 'helpful'
                    ? 'border-green-300 bg-green-100 text-green-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              <span>Yes ({article.helpful})</span>
            </button>

            <button
              onClick={() => handleFeedback(article.id, 'not-helpful')}
              className={`
                flex items-center space-x-2 rounded-md border px-4 py-2 transition-colors
                ${
                  feedback[article.id] === 'not-helpful'
                    ? 'border-red-300 bg-red-100 text-red-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                />
              </svg>
              <span>No ({article.notHelpful})</span>
            </button>
          </div>

          {feedback[article.id] && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-blue-800">
                Thank you for your feedback!
                {feedback[article.id] === 'not-helpful' && (
                  <span>
                    {' '}
                    If you need more help, please contact our support team.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Related articles */}
        <div className="mt-12 border-t pt-8">
          <h3 className="mb-4 text-lg font-semibold">Related Articles</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {articles
              .filter(
                (a) => a.id !== article.id && a.category === article.category
              )
              .slice(0, 4)
              .map((relatedArticle) => (
                <button
                  key={relatedArticle.id}
                  onClick={() => setSelectedArticle(relatedArticle.id)}
                  className="rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm"
                >
                  <h4 className="mb-2 font-medium text-gray-900">
                    {relatedArticle.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {relatedArticle.views} views
                  </p>
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryView = () => (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">Help Center</h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-600">
          Find answers to your questions and learn how to make the most of the
          SECiD platform
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative mx-auto max-w-2xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category['name']}
            </button>
          ))}
        </div>
      </div>

      {searchQuery || selectedCategory ? (
        /* Search Results */
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : `${categories.find((c) => c.id === selectedCategory)?.name} Articles`}
            </h2>
            <p className="text-gray-600">
              {filteredArticles.length} articles found
            </p>
          </div>

          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article.id)}
                className="w-full rounded-lg border border-gray-200 p-6 text-left transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {article.title}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {article.views} views
                  </span>
                </div>
                <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                  {article.content.substring(0, 150).replace(/[#*]/g, '')}...
                </p>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-1">
                    {categories.find((c) => c.id === article.category)?.name}
                  </span>
                  <span>
                    Updated {new Date(article.lastUpdated).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>{article.helpful} helpful votes</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Categories Grid */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="group rounded-lg border border-gray-200 p-6 text-left transition-all hover:border-blue-300 hover:shadow-lg"
            >
              <div className="mb-4 text-4xl">{category.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                {category['name']}
              </h3>
              <p className="mb-4 text-gray-600">{category['description']}</p>
              <p className="text-sm font-medium text-blue-600">
                {category.articleCount} articles →
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Contact Support */}
      <div className="mt-16 rounded-lg bg-gray-50 p-8 text-center">
        <h3 className="mb-2 text-xl font-semibold text-gray-900">
          Still need help?
        </h3>
        <p className="mb-6 text-gray-600">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button className="rounded-md bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
            Contact Support
          </button>
          <button className="rounded-md border border-gray-300 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50">
            Join Community Forum
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 h-32 rounded-lg bg-gray-200"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {selectedArticle ? renderArticleView() : renderCategoryView()}
    </div>
  );
};

export default HelpCenter;
