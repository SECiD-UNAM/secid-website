import React, { useMemo } from 'react';
import {
  getBlogPosts,
  mergeBlogPosts,
  filterByLocale,
  type BlogPost,
} from '@/lib/blog';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import {
  ListingSearch,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
} from '@components/listing';

interface Props {
  lang?: 'es' | 'en';
  initialPosts?: BlogPost[];
}

const translations = {
  es: {
    categories: {
      all: 'Todos',
      Tendencias: 'Tendencias',
      Tutorial: 'Tutorial',
      Carrera: 'Carrera',
      Investigación: 'Investigación',
      Opinión: 'Opinión',
    },
    featuredBadge: 'Artículo Destacado',
    newsletterTitle: '¿Te gusta nuestro contenido?',
    newsletterDesc:
      'Suscríbete a nuestro newsletter y recibe los mejores artículos directamente en tu inbox',
    newsletterBtn: 'Suscribirse al Newsletter',
    blogLink: '/es/blog/',
    newsletterLink: '/es/newsletter',
  },
  en: {
    categories: {
      all: 'All',
      Tendencias: 'Trends',
      Tutorial: 'Tutorial',
      Carrera: 'Career',
      Investigación: 'Research',
      Opinión: 'Opinion',
    },
    featuredBadge: 'Featured Article',
    newsletterTitle: 'Do you like our content?',
    newsletterDesc:
      'Subscribe to our newsletter and receive the best articles directly in your inbox',
    newsletterBtn: 'Subscribe to Newsletter',
    blogLink: '/en/blog/',
    newsletterLink: '/en/newsletter',
  },
};

const CATEGORY_KEYS = [
  'all',
  'Tendencias',
  'Tutorial',
  'Carrera',
  'Investigación',
  'Opinión',
] as const;

const POSTS_PER_PAGE = 6;

function formatDate(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function buildAdapter(
  initialPosts: BlogPost[],
  lang: 'es' | 'en'
): ClientSideAdapter<BlogPost> {
  return new ClientSideAdapter<BlogPost>({
    fetchAll: async () => {
      try {
        const firestoreData = await getBlogPosts({ status: 'published' });
        const merged = mergeBlogPosts(initialPosts, firestoreData);
        return filterByLocale(merged, lang);
      } catch {
        return filterByLocale(initialPosts, lang);
      }
    },
    searchFields: ['title', 'excerpt', 'content', 'authorName', 'category'],
    getId: (post) => post.id,
  });
}

export default function BlogList({ lang = 'es', initialPosts = [] }: Props) {
  const t = translations[lang];

  const adapter = useMemo(
    () => buildAdapter(initialPosts, lang),
    // Rebuilding the adapter when lang or initial post identity changes is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, initialPosts.length]
  );

  const {
    items,
    loading,
    query,
    setQuery,
    activeFilters,
    setFilter,
    clearFilters,
    hasMore,
    loadMore,
  } = useUniversalListing<BlogPost>({
    adapter,
    defaultViewMode: 'grid',
    paginationMode: 'cursor',
    defaultPageSize: POSTS_PER_PAGE,
    defaultSort: { field: 'publishedAt', direction: 'desc' },
    lang,
  });

  const activeCategory = (activeFilters['category'] as string) ?? 'all';

  const handleCategoryChange = (key: string) => {
    if (key === 'all') {
      clearFilters();
    } else {
      setFilter('category', key);
    }
    setQuery('');
  };

  const featuredPost =
    activeCategory === 'all' && !query
      ? items.find((p) => p.featured)
      : undefined;

  const regularPosts = featuredPost
    ? items.filter((p) => !p.featured)
    : items;

  const hasActiveFilters = activeCategory !== 'all' || !!query;

  return (
    <div>
      {/* Filters */}
      <div className="secid-blog__filter">
        <div className="secid-blog__categories">
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              className={`secid-blog__category ${activeCategory === key ? 'active' : ''}`}
              onClick={() => handleCategoryChange(key)}
            >
              {t.categories[key as keyof typeof t.categories] || key}
            </button>
          ))}
        </div>
        <div className="secid-blog__search">
          <ListingSearch
            query={query}
            onQueryChange={setQuery}
            lang={lang}
          />
        </div>
      </div>

      {/* Featured Post */}
      {featuredPost && (
        <div style={{ marginBottom: 'var(--space-3xl)' }}>
          <div className="secid-blog__featured">
            <div className="secid-blog__featured-image">
              <span className="secid-blog__featured-badge">
                {t.featuredBadge}
              </span>
            </div>
            <div className="secid-blog__featured-content">
              <div className="secid-blog__meta">
                <span className="secid-blog__category-tag">
                  {featuredPost.category}
                </span>
                <span>{formatDate(featuredPost.publishedAt, lang)}</span>
              </div>
              <h2 className="secid-blog__featured-title">
                <a href={`${t.blogLink}${featuredPost.slug}`}>
                  {featuredPost.title}
                </a>
              </h2>
              <p className="secid-blog__featured-excerpt">
                {featuredPost.excerpt}
              </p>
              <div className="secid-blog__author">
                <div className="secid-blog__author-avatar">
                  {getInitials(featuredPost.authorName)}
                </div>
                <div>
                  <div className="secid-blog__author-name">
                    {featuredPost.authorName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && <ListingLoading viewMode="grid" count={POSTS_PER_PAGE} />}

      {/* No results */}
      {!loading && items.length === 0 && (
        <ListingEmpty
          lang={lang}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      )}

      {/* Blog Grid */}
      {!loading && regularPosts.length > 0 && (
        <div className="secid-blog__grid">
          {regularPosts.map((post) => (
            <article key={post.id} className="secid-blog__card">
              <div className="secid-blog__card-image">
                <span className="secid-blog__category-badge">
                  {post.category}
                </span>
              </div>
              <div className="secid-blog__card-content">
                <div className="secid-blog__meta">
                  <span>{formatDate(post.publishedAt, lang)}</span>
                </div>
                <h3 className="secid-blog__card-title">
                  <a href={`${t.blogLink}${post.slug}`}>{post.title}</a>
                </h3>
                <p className="secid-blog__card-excerpt">{post.excerpt}</p>
                <div className="secid-blog__tags">
                  {post.tags.map((tag) => (
                    <span key={tag} className="secid-blog__tag">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="secid-blog__author">
                  <div className="secid-blog__author-avatar secid-blog__author-avatar--sm">
                    {getInitials(post.authorName)}
                  </div>
                  <div>
                    <div className="secid-blog__author-name">
                      {post.authorName}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Load More */}
      <ListingPagination
        page={1}
        totalPages={1}
        hasMore={hasMore}
        paginationMode="cursor"
        onPageChange={() => {}}
        onLoadMore={loadMore}
        loading={loading}
        lang={lang}
      />

      {/* Newsletter CTA */}
      <div
        className="secid-blog__newsletter"
        style={{ marginTop: 'var(--space-3xl)' }}
      >
        <i className="fas fa-envelope-open-text secid-blog__newsletter-icon" />
        <h2 className="secid-blog__newsletter-title">{t.newsletterTitle}</h2>
        <p className="secid-blog__newsletter-desc">{t.newsletterDesc}</p>
        <a
          href={t.newsletterLink}
          className="secid-button secid-button--primary secid-button--lg"
        >
          <i className="fas fa-paper-plane" /> {t.newsletterBtn}
        </a>
      </div>

      <style>{`
        .secid-blog__filter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-xl);
          margin-bottom: var(--space-2xl);
        }
        .secid-blog__categories {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
        }
        .secid-blog__category {
          padding: var(--space-sm) var(--space-lg);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          color: var(--color-text-primary);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-base);
        }
        .secid-blog__category:hover,
        .secid-blog__category.active {
          background: #d4431a;
          border-color: #d4431a;
          color: white;
        }
        .secid-blog__search {
          max-width: 300px;
          width: 100%;
        }
        .secid-blog__featured {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3xl);
          background: var(--card-bg);
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        .secid-blog__featured-image {
          background: linear-gradient(135deg, var(--secid-primary), var(--secid-gold));
          min-height: 400px;
          position: relative;
        }
        .secid-blog__featured-badge {
          position: absolute;
          top: var(--space-lg);
          left: var(--space-lg);
          background: white;
          color: #b5391a;
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.875rem;
        }
        .secid-blog__featured-content {
          padding: var(--space-2xl);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .secid-blog__featured-title {
          font-size: 2rem;
          font-weight: 700;
          margin: var(--space-lg) 0;
        }
        .secid-blog__featured-title a {
          color: var(--color-text-primary);
          text-decoration: none;
          transition: color var(--transition-base);
        }
        .secid-blog__featured-title a:hover {
          color: var(--secid-primary);
        }
        .secid-blog__featured-excerpt {
          color: var(--color-text-secondary);
          line-height: 1.7;
          margin-bottom: var(--space-xl);
        }
        .secid-blog__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: var(--space-xl);
        }
        .secid-blog__card {
          background: var(--card-bg);
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 1px solid var(--color-border);
          transition: all var(--transition-base);
        }
        .secid-blog__card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--secid-primary);
        }
        .secid-blog__card-image {
          height: 200px;
          background: linear-gradient(135deg, var(--secid-secondary), var(--secid-secondary-dark));
          position: relative;
        }
        .secid-blog__category-badge {
          position: absolute;
          top: var(--space-md);
          left: var(--space-md);
          background: #d4431a;
          color: white;
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .secid-blog__card-content {
          padding: var(--space-xl);
        }
        .secid-blog__meta {
          display: flex;
          gap: var(--space-md);
          color: var(--color-text-tertiary);
          font-size: 0.875rem;
          margin-bottom: var(--space-md);
        }
        .secid-blog__category-tag {
          color: #b5391a;
          font-weight: 600;
        }
        .secid-blog__card-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: var(--space-md) 0;
        }
        .secid-blog__card-title a {
          color: var(--color-text-primary);
          text-decoration: none;
          transition: color var(--transition-base);
        }
        .secid-blog__card-title a:hover {
          color: var(--secid-primary);
        }
        .secid-blog__card-excerpt {
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: var(--space-lg);
        }
        .secid-blog__tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }
        .secid-blog__tag {
          color: #3d5c70;
          font-size: 0.875rem;
        }
        .secid-blog__author {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--color-border);
        }
        .secid-blog__author-avatar {
          width: 3rem;
          height: 3rem;
          background: linear-gradient(135deg, var(--secid-primary), var(--secid-gold));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          flex-shrink: 0;
        }
        .secid-blog__author-avatar--sm {
          width: 2.5rem;
          height: 2.5rem;
          font-size: 0.875rem;
        }
        .secid-blog__author-name {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .secid-blog__newsletter {
          text-align: center;
          padding: var(--space-3xl);
          background: linear-gradient(135deg, var(--secid-cream), rgba(244, 239, 224, 0.5));
          border-radius: var(--radius-xl);
        }
        [data-theme='dark'] .secid-blog__newsletter {
          background: linear-gradient(135deg, var(--secid-gray-800), var(--secid-gray-700));
        }
        .secid-blog__newsletter-icon {
          font-size: 3rem;
          color: var(--secid-primary);
          margin-bottom: var(--space-lg);
        }
        .secid-blog__newsletter-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 var(--space-md) 0;
        }
        .secid-blog__newsletter-desc {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
          margin: 0 0 var(--space-xl) 0;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (max-width: 768px) {
          .secid-blog__filter {
            flex-direction: column;
            align-items: stretch;
          }
          .secid-blog__search {
            max-width: 100%;
          }
          .secid-blog__featured {
            grid-template-columns: 1fr;
          }
          .secid-blog__featured-image {
            min-height: 200px;
          }
          .secid-blog__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
