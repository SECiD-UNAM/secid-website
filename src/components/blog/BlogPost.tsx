import React, { useState, useEffect } from 'react';
import { getBlogPost, type BlogPost as BlogPostType } from '@/lib/blog';

interface Props {
  slug: string;
  lang?: 'es' | 'en';
}

const translations = {
  es: {
    backToList: 'Volver al blog',
    loading: 'Cargando artículo...',
    notFoundTitle: 'Artículo no encontrado',
    notFoundDesc: 'El artículo que buscas no existe o ha sido eliminado.',
    backLink: '/es/blog',
    publishedOn: 'Publicado el',
    category: 'Categoría',
    tags: 'Etiquetas',
    shareTitle: 'Compartir',
  },
  en: {
    backToList: 'Back to blog',
    loading: 'Loading article...',
    notFoundTitle: 'Article not found',
    notFoundDesc: 'The article you are looking for does not exist or has been removed.',
    backLink: '/en/blog',
    publishedOn: 'Published on',
    category: 'Category',
    tags: 'Tags',
    shareTitle: 'Share',
  },
};

function formatDate(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    day: 'numeric',
    month: 'long',
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

export default function BlogPost({ slug, lang = 'es' }: Props) {
  const t = translations[lang];
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getBlogPost(slug);
        if (data) {
          setPost(data);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error loading blog post:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <i
          className="fas fa-spinner fa-spin"
          style={{ fontSize: '2rem', color: 'var(--secid-primary)' }}
        />
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>{t.loading}</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <i
          className="fas fa-file-alt"
          style={{
            fontSize: '4rem',
            color: 'var(--color-text-tertiary)',
            marginBottom: '1.5rem',
            display: 'block',
          }}
        />
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
          {t.notFoundTitle}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          {t.notFoundDesc}
        </p>
        <a href={t.backLink} className="secid-button secid-button--primary">
          <i className="fas fa-arrow-left" /> {t.backToList}
        </a>
      </div>
    );
  }

  return (
    <div className="blog-post">
      {/* Back link */}
      <a href={t.backLink} className="blog-post__back">
        <i className="fas fa-arrow-left" /> {t.backToList}
      </a>

      {/* Header */}
      <header className="blog-post__header">
        <div className="blog-post__meta-top">
          <span className="blog-post__category">{post.category}</span>
          <span className="blog-post__date">
            {t.publishedOn} {formatDate(post.publishedAt, lang)}
          </span>
        </div>

        <h1 className="blog-post__title">{post.title}</h1>

        <p className="blog-post__excerpt">{post.excerpt}</p>

        {/* Author */}
        <div className="blog-post__author">
          <div className="blog-post__author-avatar">{getInitials(post.authorName)}</div>
          <div>
            <div className="blog-post__author-name">{post.authorName}</div>
            <div className="blog-post__author-date">
              {formatDate(post.publishedAt, lang)}
            </div>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="blog-post__image">
          <img src={post.featuredImage} alt={post.title} />
        </div>
      )}

      {/* Content */}
      <div
        className="blog-post__content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="blog-post__tags-section">
          <h4 className="blog-post__tags-title">{t.tags}</h4>
          <div className="blog-post__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="blog-post__tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Back to blog */}
      <div className="blog-post__footer">
        <a href={t.backLink} className="secid-button secid-button--outline">
          <i className="fas fa-arrow-left" /> {t.backToList}
        </a>
      </div>

      <style>{`
        .blog-post {
          max-width: 800px;
          margin: 0 auto;
        }
        .blog-post__back {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--secid-primary);
          text-decoration: none;
          font-weight: 500;
          margin-bottom: var(--space-2xl);
          transition: opacity var(--transition-base);
        }
        .blog-post__back:hover {
          opacity: 0.8;
        }
        .blog-post__header {
          margin-bottom: var(--space-2xl);
        }
        .blog-post__meta-top {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .blog-post__category {
          background: var(--secid-primary);
          color: white;
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .blog-post__date {
          color: var(--color-text-tertiary);
          font-size: 0.875rem;
        }
        .blog-post__title {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.2;
          margin: 0 0 var(--space-lg) 0;
        }
        .blog-post__excerpt {
          font-size: 1.25rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: var(--space-xl);
        }
        .blog-post__author {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--color-border);
        }
        .blog-post__author-avatar {
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
        .blog-post__author-name {
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .blog-post__author-date {
          font-size: 0.875rem;
          color: var(--color-text-tertiary);
        }
        .blog-post__image {
          border-radius: var(--radius-xl);
          overflow: hidden;
          margin-bottom: var(--space-2xl);
        }
        .blog-post__image img {
          width: 100%;
          height: auto;
          display: block;
        }
        .blog-post__content {
          color: var(--color-text-primary);
          font-size: 1.125rem;
          line-height: 1.8;
          margin-bottom: var(--space-3xl);
        }
        .blog-post__content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: var(--space-2xl) 0 var(--space-lg) 0;
          color: var(--color-text-primary);
        }
        .blog-post__content h3 {
          font-size: 1.375rem;
          font-weight: 600;
          margin: var(--space-xl) 0 var(--space-md) 0;
          color: var(--color-text-primary);
        }
        .blog-post__content p {
          margin-bottom: var(--space-lg);
        }
        .blog-post__content ul,
        .blog-post__content ol {
          margin-bottom: var(--space-lg);
          padding-left: var(--space-xl);
        }
        .blog-post__content li {
          margin-bottom: var(--space-sm);
        }
        .blog-post__content blockquote {
          border-left: 4px solid var(--secid-primary);
          padding: var(--space-lg);
          margin: var(--space-xl) 0;
          background: var(--card-bg);
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          font-style: italic;
          color: var(--color-text-secondary);
        }
        .blog-post__content code {
          background: var(--card-bg);
          padding: 0.2em 0.4em;
          border-radius: var(--radius-sm);
          font-size: 0.9em;
        }
        .blog-post__content pre {
          background: var(--card-bg);
          padding: var(--space-lg);
          border-radius: var(--radius-md);
          overflow-x: auto;
          margin-bottom: var(--space-lg);
        }
        .blog-post__content pre code {
          background: transparent;
          padding: 0;
        }
        .blog-post__content a {
          color: var(--secid-primary);
          text-decoration: underline;
        }
        .blog-post__content img {
          max-width: 100%;
          border-radius: var(--radius-md);
          margin: var(--space-lg) 0;
        }
        .blog-post__tags-section {
          padding: var(--space-xl) 0;
          border-top: 1px solid var(--color-border);
          margin-bottom: var(--space-xl);
        }
        .blog-post__tags-title {
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 var(--space-md) 0;
        }
        .blog-post__tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }
        .blog-post__tag {
          background: var(--card-bg);
          border: 1px solid var(--color-border);
          color: var(--secid-secondary);
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
        }
        .blog-post__footer {
          text-align: center;
          padding: var(--space-2xl) 0;
        }
        @media (max-width: 768px) {
          .blog-post__title {
            font-size: 1.75rem;
          }
          .blog-post__excerpt {
            font-size: 1.1rem;
          }
          .blog-post__content {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
