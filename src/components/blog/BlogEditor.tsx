import React, { useState, useCallback } from 'react';
import { createBlogPost, type BlogPost } from '@/lib/blog';
import { useAuthContext } from '@/contexts/AuthContext';

interface Props {
  lang?: 'es' | 'en';
}

const translations = {
  es: {
    pageTitle: 'Crear Nuevo Artículo',
    titleLabel: 'Título',
    titlePlaceholder: 'Escribe el título del artículo...',
    slugLabel: 'Slug (URL)',
    slugPlaceholder: 'se-genera-automaticamente',
    excerptLabel: 'Resumen',
    excerptPlaceholder: 'Un breve resumen del artículo (máx. 200 caracteres)...',
    contentLabel: 'Contenido (HTML)',
    contentPlaceholder: '<h2>Título de sección</h2>\n<p>Escribe tu contenido aquí...</p>',
    categoryLabel: 'Categoría',
    categoryOptions: {
      Tendencias: 'Tendencias',
      Tutorial: 'Tutorial',
      Carrera: 'Carrera',
      'Investigación': 'Investigación',
      'Opinión': 'Opinión',
    },
    selectCategory: 'Selecciona una categoría',
    tagsLabel: 'Etiquetas (separadas por coma)',
    tagsPlaceholder: 'IA, Machine Learning, Python',
    featuredImageLabel: 'URL de imagen destacada',
    featuredImagePlaceholder: 'https://ejemplo.com/imagen.jpg',
    featuredLabel: 'Artículo destacado',
    statusLabel: 'Estado',
    draft: 'Borrador',
    published: 'Publicado',
    preview: 'Vista previa',
    editor: 'Editor',
    publish: 'Publicar artículo',
    saveDraft: 'Guardar borrador',
    successTitle: 'Artículo creado con éxito',
    successDesc: 'Tu artículo ha sido creado. ',
    viewPost: 'Ver artículo',
    errorTitle: 'Error al crear el artículo',
    errorDesc: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
    required: 'Este campo es requerido',
    loginRequired: 'Debes iniciar sesión para crear artículos.',
    loginLink: 'Iniciar sesión',
    loginHref: '/es/login',
    backToBlog: 'Volver al blog',
    backHref: '/es/blog',
    blogLink: '/es/blog/',
  },
  en: {
    pageTitle: 'Create New Article',
    titleLabel: 'Title',
    titlePlaceholder: 'Write the article title...',
    slugLabel: 'Slug (URL)',
    slugPlaceholder: 'auto-generated',
    excerptLabel: 'Excerpt',
    excerptPlaceholder: 'A brief summary of the article (max 200 chars)...',
    contentLabel: 'Content (HTML)',
    contentPlaceholder: '<h2>Section title</h2>\n<p>Write your content here...</p>',
    categoryLabel: 'Category',
    categoryOptions: {
      Tendencias: 'Trends',
      Tutorial: 'Tutorial',
      Carrera: 'Career',
      'Investigación': 'Research',
      'Opinión': 'Opinion',
    },
    selectCategory: 'Select a category',
    tagsLabel: 'Tags (comma-separated)',
    tagsPlaceholder: 'AI, Machine Learning, Python',
    featuredImageLabel: 'Featured image URL',
    featuredImagePlaceholder: 'https://example.com/image.jpg',
    featuredLabel: 'Featured article',
    statusLabel: 'Status',
    draft: 'Draft',
    published: 'Published',
    preview: 'Preview',
    editor: 'Editor',
    publish: 'Publish article',
    saveDraft: 'Save draft',
    successTitle: 'Article created successfully',
    successDesc: 'Your article has been created. ',
    viewPost: 'View article',
    errorTitle: 'Error creating article',
    errorDesc: 'An unexpected error occurred. Please try again.',
    required: 'This field is required',
    loginRequired: 'You must log in to create articles.',
    loginLink: 'Log in',
    loginHref: '/en/login',
    backToBlog: 'Back to blog',
    backHref: '/en/blog',
    blogLink: '/en/blog/',
  },
};

const CATEGORY_KEYS = ['Tendencias', 'Tutorial', 'Carrera', 'Investigación', 'Opinión'] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function BlogEditor({ lang = 'es' }: Props) {
  const t = translations[lang];
  const { userProfile, isAuthenticated } = useAuthContext();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugManual) {
        setSlug(slugify(value));
      }
    },
    [slugManual]
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugManual(true);
    setSlug(slugify(value));
  }, []);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = t.required;
    if (!excerpt.trim()) newErrors.excerpt = t.required;
    if (!content.trim()) newErrors.content = t.required;
    if (!category) newErrors.category = t.required;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(submitStatus: 'draft' | 'published') {
    if (!validate()) return;

    setSubmitting(true);
    setError('');
    setStatus(submitStatus);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const postData: Omit<BlogPost, 'id' | 'publishedAt'> = {
        title: title.trim(),
        slug: slug || slugify(title),
        excerpt: excerpt.trim(),
        content,
        category,
        tags,
        featured,
        status: submitStatus,
        authorId: userProfile?.uid || 'anonymous',
        authorName:
          userProfile?.displayName ||
          `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() ||
          'Anonymous',
        featuredImage: featuredImage.trim() || undefined,
      };

      await createBlogPost(postData);
      setSuccess(true);
      setCreatedSlug(postData.slug);
    } catch (err) {
      console.error('Error creating blog post:', err);
      setError(t.errorDesc);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <i
          className="fas fa-lock"
          style={{ fontSize: '3rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem', display: 'block' }}
        />
        <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>{t.loginRequired}</h3>
        <a href={t.loginHref} className="secid-button secid-button--primary">
          {t.loginLink}
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <i
          className="fas fa-check-circle"
          style={{ fontSize: '4rem', color: 'var(--secid-primary)', marginBottom: '1.5rem', display: 'block' }}
        />
        <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>{t.successTitle}</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          {t.successDesc}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={`${t.blogLink}${createdSlug}`} className="secid-button secid-button--primary">
            {t.viewPost}
          </a>
          <a href={t.backHref} className="secid-button secid-button--outline">
            {t.backToBlog}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-editor">
      <div className="blog-editor__header">
        <a href={t.backHref} className="blog-editor__back">
          <i className="fas fa-arrow-left" /> {t.backToBlog}
        </a>
        <h1 className="blog-editor__title">{t.pageTitle}</h1>
      </div>

      {error && (
        <div className="blog-editor__error">
          <i className="fas fa-exclamation-circle" /> {error}
        </div>
      )}

      {/* Toggle Preview / Editor */}
      <div className="blog-editor__toggle">
        <button
          className={`blog-editor__toggle-btn ${!showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(false)}
        >
          <i className="fas fa-edit" /> {t.editor}
        </button>
        <button
          className={`blog-editor__toggle-btn ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(true)}
        >
          <i className="fas fa-eye" /> {t.preview}
        </button>
      </div>

      {showPreview ? (
        <div className="blog-editor__preview">
          <div className="blog-editor__preview-header">
            {category && <span className="blog-editor__preview-category">{category}</span>}
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '1rem 0', color: 'var(--color-text-primary)' }}>
              {title || t.titlePlaceholder}
            </h1>
            {excerpt && (
              <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {excerpt}
              </p>
            )}
          </div>
          {content ? (
            <div
              className="blog-editor__preview-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              {t.contentPlaceholder}
            </p>
          )}
          {tagsInput && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              {tagsInput.split(',').map((tag) => (
                <span
                  key={tag.trim()}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--color-border)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.875rem',
                    color: 'var(--secid-secondary)',
                  }}
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="blog-editor__form">
          {/* Title */}
          <div className="blog-editor__field">
            <label className="blog-editor__label">{t.titleLabel} *</label>
            <input
              type="text"
              className={`secid-form__input ${errors.title ? 'secid-form__input--error' : ''}`}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t.titlePlaceholder}
            />
            {errors.title && <span className="blog-editor__field-error">{errors.title}</span>}
          </div>

          {/* Slug */}
          <div className="blog-editor__field">
            <label className="blog-editor__label">{t.slugLabel}</label>
            <input
              type="text"
              className="secid-form__input"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={t.slugPlaceholder}
            />
          </div>

          {/* Excerpt */}
          <div className="blog-editor__field">
            <label className="blog-editor__label">{t.excerptLabel} *</label>
            <textarea
              className={`secid-form__input ${errors.excerpt ? 'secid-form__input--error' : ''}`}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder={t.excerptPlaceholder}
              rows={3}
              maxLength={200}
            />
            {errors.excerpt && <span className="blog-editor__field-error">{errors.excerpt}</span>}
          </div>

          {/* Content */}
          <div className="blog-editor__field">
            <label className="blog-editor__label">{t.contentLabel} *</label>
            <textarea
              className={`secid-form__input blog-editor__content-input ${errors.content ? 'secid-form__input--error' : ''}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.contentPlaceholder}
              rows={15}
            />
            {errors.content && <span className="blog-editor__field-error">{errors.content}</span>}
          </div>

          {/* Category */}
          <div className="blog-editor__field">
            <label className="blog-editor__label">{t.categoryLabel} *</label>
            <select
              className={`secid-form__input ${errors.category ? 'secid-form__input--error' : ''}`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t.selectCategory}</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t.categoryOptions[key]}
                </option>
              ))}
            </select>
            {errors.category && <span className="blog-editor__field-error">{errors.category}</span>}
          </div>

          {/* Tags */}
          <div className="blog-editor__field">
            <label className="blog-editor__label">{t.tagsLabel}</label>
            <input
              type="text"
              className="secid-form__input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t.tagsPlaceholder}
            />
          </div>

          {/* Featured Image */}
          <div className="blog-editor__field">
            <label className="blog-editor__label">{t.featuredImageLabel}</label>
            <input
              type="url"
              className="secid-form__input"
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              placeholder={t.featuredImagePlaceholder}
            />
          </div>

          {/* Featured checkbox */}
          <div className="blog-editor__field blog-editor__field--checkbox">
            <label className="blog-editor__checkbox-label">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              {t.featuredLabel}
            </label>
          </div>

          {/* Actions */}
          <div className="blog-editor__actions">
            <button
              className="secid-button secid-button--outline secid-button--lg"
              onClick={() => handleSubmit('draft')}
              disabled={submitting}
            >
              {submitting && status === 'draft' ? (
                <i className="fas fa-spinner fa-spin" />
              ) : (
                <i className="fas fa-save" />
              )}
              {' '}{t.saveDraft}
            </button>
            <button
              className="secid-button secid-button--primary secid-button--lg"
              onClick={() => handleSubmit('published')}
              disabled={submitting}
            >
              {submitting && status === 'published' ? (
                <i className="fas fa-spinner fa-spin" />
              ) : (
                <i className="fas fa-paper-plane" />
              )}
              {' '}{t.publish}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .blog-editor {
          max-width: 900px;
          margin: 0 auto;
        }
        .blog-editor__header {
          margin-bottom: var(--space-2xl);
        }
        .blog-editor__back {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--secid-primary);
          text-decoration: none;
          font-weight: 500;
          margin-bottom: var(--space-lg);
          transition: opacity var(--transition-base);
        }
        .blog-editor__back:hover {
          opacity: 0.8;
        }
        .blog-editor__title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }
        .blog-editor__error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: var(--space-md) var(--space-lg);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-xl);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .blog-editor__toggle {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-xl);
        }
        .blog-editor__toggle-btn {
          padding: var(--space-sm) var(--space-lg);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all var(--transition-base);
        }
        .blog-editor__toggle-btn:hover {
          border-color: var(--secid-primary);
          color: var(--secid-primary);
        }
        .blog-editor__toggle-btn.active {
          background: var(--secid-primary);
          border-color: var(--secid-primary);
          color: white;
        }
        .blog-editor__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-xl);
        }
        .blog-editor__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .blog-editor__field--checkbox {
          flex-direction: row;
          align-items: center;
        }
        .blog-editor__label {
          font-weight: 600;
          color: var(--color-text-primary);
          font-size: 0.95rem;
        }
        .blog-editor__checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-primary);
          cursor: pointer;
          font-weight: 500;
        }
        .blog-editor__checkbox-label input {
          width: 1.125rem;
          height: 1.125rem;
          cursor: pointer;
        }
        .blog-editor__field-error {
          color: #dc2626;
          font-size: 0.875rem;
        }
        .secid-form__input--error {
          border-color: #dc2626 !important;
        }
        .blog-editor__content-input {
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .blog-editor__actions {
          display: flex;
          gap: var(--space-md);
          justify-content: flex-end;
          padding-top: var(--space-xl);
          border-top: 1px solid var(--color-border);
        }
        .blog-editor__preview {
          background: var(--card-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-2xl);
        }
        .blog-editor__preview-category {
          background: var(--secid-primary);
          color: white;
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .blog-editor__preview-content {
          color: var(--color-text-primary);
          font-size: 1.125rem;
          line-height: 1.8;
          margin-top: var(--space-xl);
        }
        .blog-editor__preview-content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: var(--space-xl) 0 var(--space-md) 0;
        }
        .blog-editor__preview-content h3 {
          font-size: 1.375rem;
          font-weight: 600;
          margin: var(--space-lg) 0 var(--space-sm) 0;
        }
        .blog-editor__preview-content p {
          margin-bottom: var(--space-lg);
        }
        @media (max-width: 768px) {
          .blog-editor__actions {
            flex-direction: column;
          }
          .blog-editor__title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
