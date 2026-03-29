/**
 * SEO Utility Functions for SECiD Platform
 * Provides comprehensive SEO tools and helpers
 */

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  lang: 'es' | 'en';
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile' | 'video' | 'book';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export interface JobSEOData {
  title: string;
  company: string;
  location: string;
  country?: string;
  description: string;
  employmentType: string;
  datePosted: string;
  validThrough: string;
  salary?: number;
  currency?: string;
  companyUrl?: string;
}

export interface EventSEOData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  address?: string;
  isOnline?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generates optimized page title with proper length and branding
 */
export function generatePageTitle(
  title: string,
  suffix = 'SECiD UNAM'
): string {
  const maxLength = 60;
  const fullTitle = `${title} - ${suffix}`;

  if (fullTitle.length <= maxLength) {
    return fullTitle;
  }

  // Truncate title to fit within limits
  const availableLength = maxLength - ` - ${suffix}`.length;
  const truncatedTitle = title.substring(0, availableLength - 3) + '...';

  return `${truncatedTitle} - ${suffix}`;
}

/**
 * Generates SEO-optimized meta description
 */
export function generateMetaDescription(
  content: string,
  maxLength = 160
): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Find the last complete sentence within the limit
  const truncated = content.substring(0, maxLength - 3);
  const lastSentence = truncated.lastIndexOf('.');

  if (lastSentence > maxLength * 0.7) {
    return content.substring(0, lastSentence + 1);
  }

  // If no good sentence break, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return content.substring(0, lastSpace) + '...';
}

/**
 * Generates relevant keywords based on content
 */
export function generateKeywords(
  content: string,
  baseKeywords: string[] = [],
  maxKeywords = 10
): string[] {
  const spanishKeywords = [
    'ciencia de datos',
    'UNAM',
    'egresados',
    'empleo',
    'trabajo',
    'networking',
    'data science',
    'universidad',
    'análisis de datos',
    'machine learning',
    'inteligencia artificial',
    'estadística',
    'programación',
    'python',
    'r',
    'sql',
    'big data',
  ];

  const englishKeywords = [
    'data science',
    'UNAM',
    'alumni',
    'jobs',
    'employment',
    'networking',
    'university',
    'data analysis',
    'machine learning',
    'artificial intelligence',
    'statistics',
    'programming',
    'python',
    'r',
    'sql',
    'big data',
  ];

  // Extract keywords from content
  const contentKeywords = extractKeywordsFromContent(content);

  // Combine and deduplicate
  const allKeywords = [
    ...baseKeywords,
    ...contentKeywords,
    ...spanishKeywords,
    ...englishKeywords,
  ];

  return [...new Set(allKeywords)].slice(0, maxKeywords);
}

/**
 * Extracts keywords from content using simple frequency analysis
 */
function extractKeywordsFromContent(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  const frequency: Record<string, number> = {};
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Generates hreflang alternates for multilingual pages
 */
export function generateHreflangAlternates(
  currentPath: string,
  baseUrl: string
): Array<{ href: string; hreflang: string }> {
  const alternates = [];

  // Spanish version
  if (!currentPath.startsWith('/es/')) {
    alternates.push({
      href: `${baseUrl}/es${currentPath}`,
      hreflang: 'es',
    });
  }

  // English version
  if (!currentPath.startsWith('/en/')) {
    alternates.push({
      href: `${baseUrl}/en${currentPath}`,
      hreflang: 'en',
    });
  }

  // Default version (x-default)
  alternates.push({
    href: `${baseUrl}${currentPath.replace(/^\/(es|en)/, '')}`,
    hreflang: 'x-default',
  });

  return alternates;
}

/**
 * Generates canonical URL ensuring proper formatting
 */
export function generateCanonicalUrl(path: string, baseUrl: string): string {
  const cleanPath = path.replace(/\/+/g, '/');
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

  return `${cleanBaseUrl}${cleanPath}`;
}

/**
 * Validates and optimizes Open Graph image
 */
export function validateOGImage(
  imagePath: string,
  baseUrl: string
): {
  url: string;
  isValid: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  const url = imagePath.startsWith('http')
    ? imagePath
    : `${baseUrl}${imagePath}`;

  // Check image format
  const validFormats = ['.jpg', '.jpeg', '.png', '.webp'];
  const hasValidFormat = validFormats.some((format) =>
    url.toLowerCase().includes(format)
  );

  if (!hasValidFormat) {
    recommendations.push(
      'Use JPG, PNG, or WebP format for better compatibility'
    );
  }

  // Check if it's likely to be the right size
  if (!url.includes('og-') && !url.includes('social-')) {
    recommendations.push(
      'Consider using dedicated social media images (1200x630px)'
    );
  }

  return {
    url,
    isValid: hasValidFormat,
    recommendations,
  };
}

/**
 * Generates structured data for job postings
 */
export function generateJobStructuredData(
  job: JobSEOData
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      ...(job.companyUrl && { sameAs: job.companyUrl }),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressCountry: job.country || 'MX',
      },
    },
    employmentType: job.employmentType,
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    ...(job.salary && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: job.currency || 'MXN',
        value: {
          '@type': 'QuantitativeValue',
          value: job.salary,
          unitText: 'MONTH',
        },
      },
    }),
  };
}

/**
 * Generates structured data for events
 */
export function generateEventStructuredData(
  event: EventSEOData
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event['name'],
    description: event['description'],
    startDate: event.startDate,
    endDate: event.endDate,
    location: {
      '@type': 'Place',
      name: event.location,
      ...(event.address && { address: event.address }),
    },
    organizer: {
      '@type': 'Organization',
      name: 'SECiD UNAM',
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
  };
}

/**
 * Generates breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(
  breadcrumbs: BreadcrumbItem[],
  baseUrl: string
): Record<string, any> | null {
  if (breadcrumbs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item['name'],
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Analyzes content for SEO optimization opportunities
 */
export function analyzeSEOContent(content: string): {
  score: number;
  recommendations: string[];
  issues: string[];
} {
  const recommendations: string[] = [];
  const issues: string[] = [];
  let score = 100;

  // Check content length
  if (content.length < 300) {
    issues.push('Content is too short (< 300 characters)');
    score -= 20;
  } else if (content.length < 600) {
    recommendations.push(
      'Consider expanding content to 600+ characters for better SEO'
    );
    score -= 5;
  }

  // Check for headings
  const hasH1 = /<h1[^>]*>/i.test(content);
  const hasH2 = /<h2[^>]*>/i.test(content);

  if (!hasH1) {
    issues.push('Missing H1 heading');
    score -= 15;
  }

  if (!hasH2) {
    recommendations.push('Add H2 headings to improve content structure');
    score -= 5;
  }

  // Check for images with alt text
  const images = content.match(/<img[^>]*>/gi) || [];
  const imagesWithoutAlt = images.filter((img) => !img.includes('alt='));

  if (imagesWithoutAlt.length > 0) {
    issues.push(`${imagesWithoutAlt.length} image(s) missing alt text`);
    score -= imagesWithoutAlt.length * 5;
  }

  // Check for internal links
  const internalLinks = (
    content.match(/href=["'][^"']*secid[^"']*["']/gi) || []
  ).length;
  if (internalLinks === 0) {
    recommendations.push('Add internal links to improve site navigation');
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    recommendations,
    issues,
  };
}

/**
 * Generates sitemap entry for a page
 */
export function generateSitemapEntry(
  url: string,
  lastmod?: string,
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never',
  priority?: number
): string {
  const lastmodString = lastmod || new Date().toISOString().split('T')[0];
  const changefreqString = changefreq || 'weekly';
  const priorityString = priority !== undefined ? priority.toFixed(1) : '0.8';

  return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmodString}</lastmod>
    <changefreq>${changefreqString}</changefreq>
    <priority>${priorityString}</priority>
  </url>`;
}

/**
 * Generates complete sitemap XML
 */
export function generateSitemap(
  pages: Array<{
    url: string;
    lastmod?: string;
    changefreq?:
      | 'always'
      | 'hourly'
      | 'daily'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | 'never';
    priority?: number;
  }>
): string {
  const entries = pages
    .map((page) =>
      generateSitemapEntry(
        page.url,
        page.lastmod,
        page.changefreq,
        page.priority
      )
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

/**
 * Validates robots.txt directives
 */
export function generateRobotsTxt(
  baseUrl: string,
  customDirectives: string[] = []
): string {
  const defaultDirectives = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /dashboard/',
    'Disallow: /api/',
    'Disallow: /*.json$',
    'Disallow: /*?*',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
    '# SECiD Platform - Data Science Alumni Network',
    '# Contact: info@secid.mx',
  ];

  return [...defaultDirectives, ...customDirectives].join('\n');
}

/**
 * Extracts and validates metadata from frontmatter
 */
export function extractMetadataFromFrontmatter(
  frontmatter: Record<string, any>,
  defaults: Partial<SEOMetadata> = {}
): SEOMetadata {
  return {
    title: frontmatter.title || defaults.title || '',
    description: frontmatter['description'] || defaults['description'] || '',
    keywords: frontmatter.keywords || defaults.keywords || [],
    lang: frontmatter.lang || defaults.lang || 'es',
    ogImage: frontmatter.ogImage || defaults.ogImage,
    ogType: frontmatter.ogType || defaults.ogType || 'website',
    author: frontmatter.author || defaults.author,
    publishedTime: frontmatter.publishedTime || defaults.publishedTime,
    modifiedTime: frontmatter.modifiedTime || defaults.modifiedTime,
    section: frontmatter.section || defaults.section,
    tags: frontmatter.tags || defaults.tags || [],
    canonicalUrl: frontmatter.canonicalUrl || defaults.canonicalUrl,
    noindex: frontmatter.noindex || defaults.noindex || false,
    nofollow: frontmatter.nofollow || defaults.nofollow || false,
  };
}
