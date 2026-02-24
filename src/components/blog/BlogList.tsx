import React, { useState, useEffect, useCallback } from 'react';
import { getBlogPosts, type BlogPost, type BlogFilters } from '@/lib/blog';

interface Props {
  lang?: 'es' | 'en';
}

const translations = {
  es: {
    categories: {
      all: 'Todos',
      Tendencias: 'Tendencias',
      Tutorial: 'Tutorial',
      Carrera: 'Carrera',
      'Investigación': 'Investigación',
      'Opinión': 'Opinión',
    },
    searchPlaceholder: 'Buscar artículos...',
    featuredBadge: 'Artículo Destacado',
    readMore: 'Leer más',
    loadMore: 'Cargar más artículos',
    noResults: 'No se encontraron artículos.',
    noResultsSub: 'Intenta con otros filtros o términos de búsqueda.',
    loading: 'Cargando artículos...',
    readSuffix: 'lectura',
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
      'Investigación': 'Research',
      'Opinión': 'Opinion',
    },
    searchPlaceholder: 'Search articles...',
    featuredBadge: 'Featured Article',
    readMore: 'Read more',
    loadMore: 'Load more articles',
    noResults: 'No articles found.',
    noResultsSub: 'Try different filters or search terms.',
    loading: 'Loading articles...',
    readSuffix: 'read',
    newsletterTitle: 'Do you like our content?',
    newsletterDesc:
      'Subscribe to our newsletter and receive the best articles directly in your inbox',
    newsletterBtn: 'Subscribe to Newsletter',
    blogLink: '/en/blog/',
    newsletterLink: '/en/newsletter',
  },
};

const CATEGORY_KEYS = ['all', 'Tendencias', 'Tutorial', 'Carrera', 'Investigación', 'Opinión'] as const;
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

export default function BlogList({ lang = 'es' }: Props) {
  const t = translations[lang];
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const filters: BlogFilters = { status: 'published' };
      if (activeCategory !== 'all') {
        filters.category = activeCategory;
      }
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      const data = await getBlogPosts(filters);
      setPosts(data);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [activeCategory, searchQuery]);

  const featuredPost = posts.find((p) => p.featured);
  const regularPosts = posts.filter((p) => !p.featured);
  const visiblePosts = regularPosts.slice(0, visibleCount);
  const hasMore = visibleCount < regularPosts.length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--secid-primary)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="secid-blog__filter">
        <div className="secid-blog__categories">
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              className={`secid-blog__category ${activeCategory === key ? 'active' : ''}`}
              onClick={() => setActiveCategory(key)}
            >
              {t.categories[key as keyof typeof t.categories] || key}
            </button>
          ))}
        </div>
        <div className="secid-blog__search">
          <input
            type="search"
            placeholder={t.searchPlaceholder}
            className="secid-form__input secid-form__input--search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fas fa-search" />
        </div>
      </div>

      {/* Featured Post */}
      {featuredPost && activeCategory === 'all' && !searchQuery && (
        <div style={{ marginBottom: 'var(--space-3xl)' }}>
          <div className="secid-blog__featured">
            <div className="secid-blog__featured-image">
              <span className="secid-blog__featured-badge">{t.featuredBadge}</span>
            </div>
            <div className="secid-blog__featured-content">
              <div className="secid-blog__meta">
                <span className="secid-blog__category-tag">{featuredPost.category}</span>
                <span>{formatDate(featuredPost.publishedAt, lang)}</span>
              </div>
              <h2 className="secid-blog__featured-title">
                <a href={`${t.blogLink}${featuredPost.slug}`}>{featuredPost.title}</a>
              </h2>
              <p className="secid-blog__featured-excerpt">{featuredPost.excerpt}</p>
              <div className="secid-blog__author">
                <div className="secid-blog__author-avatar">{getInitials(featuredPost.authorName)}</div>
                <div>
                  <div className="secid-blog__author-name">{featuredPost.authorName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No results */}
      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <i
            className="fas fa-search"
            style={{ fontSize: '3rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem', display: 'block' }}
          />
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>{t.noResults}</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>{t.noResultsSub}</p>
        </div>
      )}

      {/* Blog Grid */}
      {visiblePosts.length > 0 && (
        <div className="secid-blog__grid">
          {visiblePosts.map((post) => (
            <article key={post.id} className="secid-blog__card">
              <div className="secid-blog__card-image">
                <span className="secid-blog__category-badge">{post.category}</span>
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
                    <div className="secid-blog__author-name">{post.authorName}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="secid-blog__load-more">
          <button
            className="secid-button secid-button--outline secid-button--lg"
            onClick={() => setVisibleCount((prev) => prev + POSTS_PER_PAGE)}
          >
            <i className="fas fa-plus" />
            {' '}{t.loadMore}
          </button>
        </div>
      )}

      {/* Newsletter CTA */}
      <div className="secid-blog__newsletter" style={{ marginTop: 'var(--space-3xl)' }}>
        <i className="fas fa-envelope-open-text secid-blog__newsletter-icon" />
        <h2 className="secid-blog__newsletter-title">{t.newsletterTitle}</h2>
        <p className="secid-blog__newsletter-desc">{t.newsletterDesc}</p>
        <a href={t.newsletterLink} className="secid-button secid-button--primary secid-button--lg">
          <i className="fas fa-paper-plane" />
          {' '}{t.newsletterBtn}
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
          background: var(--secid-primary);
          border-color: var(--secid-primary);
          color: white;
        }
        .secid-blog__search {
          position: relative;
          max-width: 300px;
        }
        .secid-blog__search input {
          padding-right: var(--space-3xl);
        }
        .secid-blog__search i {
          position: absolute;
          right: var(--space-lg);
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-tertiary);
          pointer-events: none;
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
          color: var(--secid-primary);
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
          background: var(--secid-primary);
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
          color: var(--secid-primary);
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
          color: var(--secid-secondary);
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
        .secid-blog__load-more {
          text-align: center;
          margin-top: var(--space-3xl);
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
