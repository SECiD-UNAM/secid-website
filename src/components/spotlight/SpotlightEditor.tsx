import React, { useState, useEffect } from 'react';
import {
  createSpotlight,
  updateSpotlight,
  getSpotlight,
} from '@/lib/spotlights';

interface Props {
  lang?: 'es' | 'en';
  spotlightId?: string;
}

export default function SpotlightEditor({ lang = 'es', spotlightId }: Props) {
  const isEditMode = Boolean(spotlightId);

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [graduationYear, setGraduationYear] = useState<number>(
    new Date().getFullYear()
  );
  const [story, setStory] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [featured, setFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  const t = {
    es: {
      pageTitle: isEditMode
        ? 'Editar Historia de Egresado'
        : 'Publicar Historia de Egresado',
      pageDescription: isEditMode
        ? 'Actualiza la historia de exito de un egresado de la comunidad SECiD.'
        : 'Comparte la historia de exito de un egresado de la comunidad SECiD.',
      name: 'Nombre completo',
      namePlaceholder: 'Ej. Maria Garcia Lopez',
      title: 'Puesto / Titulo',
      titlePlaceholder: 'Ej. Senior Data Scientist',
      company: 'Empresa',
      companyPlaceholder: 'Ej. Google',
      graduationYear: 'Ano de generacion',
      excerpt: 'Resumen corto',
      excerptPlaceholder: 'Una oracion que resuma la historia...',
      story: 'Historia (HTML permitido)',
      storyPlaceholder: '<h2>Mi camino</h2><p>Escribe la historia aqui...</p>',
      tags: 'Etiquetas (separadas por comas)',
      tagsPlaceholder: 'Ej. Machine Learning, Google, Liderazgo',
      featured: 'Marcar como destacada',
      submit: isEditMode ? 'Actualizar Historia' : 'Publicar Historia',
      submitting: isEditMode ? 'Actualizando...' : 'Publicando...',
      success: isEditMode
        ? 'Historia actualizada exitosamente.'
        : 'Historia publicada exitosamente.',
      error: isEditMode
        ? 'Error al actualizar la historia. Intenta de nuevo.'
        : 'Error al publicar la historia. Intenta de nuevo.',
      errorLoading: 'Error al cargar la historia.',
      back: 'Volver a historias',
      required: 'Este campo es obligatorio.',
    },
    en: {
      pageTitle: isEditMode
        ? 'Edit Alumni Story'
        : 'Publish Alumni Story',
      pageDescription: isEditMode
        ? 'Update the success story of a SECiD alumni community member.'
        : 'Share the success story of a SECiD alumni community member.',
      name: 'Full name',
      namePlaceholder: 'E.g. Maria Garcia Lopez',
      title: 'Position / Title',
      titlePlaceholder: 'E.g. Senior Data Scientist',
      company: 'Company',
      companyPlaceholder: 'E.g. Google',
      graduationYear: 'Graduation year',
      excerpt: 'Short summary',
      excerptPlaceholder: 'A one-sentence summary of the story...',
      story: 'Story (HTML allowed)',
      storyPlaceholder: '<h2>My journey</h2><p>Write the story here...</p>',
      tags: 'Tags (comma-separated)',
      tagsPlaceholder: 'E.g. Machine Learning, Google, Leadership',
      featured: 'Mark as featured',
      submit: isEditMode ? 'Update Story' : 'Publish Story',
      submitting: isEditMode ? 'Updating...' : 'Publishing...',
      success: isEditMode
        ? 'Story updated successfully.'
        : 'Story published successfully.',
      error: isEditMode
        ? 'Error updating the story. Please try again.'
        : 'Error publishing the story. Please try again.',
      errorLoading: 'Error loading the story.',
      back: 'Back to stories',
      required: 'This field is required.',
    },
  }[lang];

  useEffect(() => {
    if (!spotlightId) return;

    let cancelled = false;

    async function loadSpotlight() {
      try {
        const existing = await getSpotlight(spotlightId!);
        if (cancelled) return;
        if (!existing) {
          setError(t.errorLoading);
          return;
        }
        setName(existing.name);
        setTitle(existing.title);
        setCompany(existing.company);
        setGraduationYear(existing.graduationYear);
        setStory(existing.story);
        setExcerpt(existing.excerpt);
        setTagsInput(existing.tags.join(', '));
        setFeatured(existing.featured);
      } catch {
        if (!cancelled) setError(t.errorLoading);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }

    loadSpotlight();
    return () => {
      cancelled = true;
    };
  }, [spotlightId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!name || !title || !company || !story || !excerpt) {
      setError(t.required);
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (isEditMode && spotlightId) {
        await updateSpotlight(spotlightId, {
          name,
          title,
          company,
          graduationYear,
          story,
          excerpt,
          tags,
          featured,
        });
      } else {
        await createSpotlight({
          name,
          title,
          company,
          graduationYear,
          story,
          excerpt,
          tags,
          featured,
          status: 'published',
        });
      }

      setSuccess(true);

      if (!isEditMode) {
        setName('');
        setTitle('');
        setCompany('');
        setGraduationYear(new Date().getFullYear());
        setStory('');
        setExcerpt('');
        setTagsInput('');
        setFeatured(false);
      }
    } catch (err) {
      console.error(
        isEditMode ? 'Error updating spotlight:' : 'Error creating spotlight:',
        err
      );
      setError(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
    background: 'var(--card-bg)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--color-text-primary)',
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: '1.5rem',
  };

  if (loadingExisting) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
          {lang === 'es' ? 'Cargando historia...' : 'Loading story...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <a
        href={`/${lang}/dashboard/spotlights`}
        style={{
          color: 'var(--secid-primary)',
          display: 'inline-block',
          marginBottom: '1.5rem',
          textDecoration: 'none',
        }}
      >
        {'\u2190'} {t.back}
      </a>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          color: 'var(--color-text-primary)',
        }}
      >
        {t.pageTitle}
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginBottom: '2rem',
        }}
      >
        {t.pageDescription}
      </p>

      {success && (
        <div
          style={{
            padding: '1rem',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: 'var(--radius-md)',
            color: '#155724',
            marginBottom: '1.5rem',
          }}
        >
          {t.success}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: 'var(--radius-md)',
            color: '#721c24',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
        }}
      >
        <div style={fieldStyle}>
          <label style={labelStyle}>{t.name}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            style={inputStyle}
            required
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            ...fieldStyle,
          }}
        >
          <div>
            <label style={labelStyle}>{t.title}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>{t.company}</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t.companyPlaceholder}
              style={inputStyle}
              required
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t.graduationYear}</label>
          <input
            type="number"
            value={graduationYear}
            onChange={(e) => setGraduationYear(Number(e.target.value))}
            min={2000}
            max={new Date().getFullYear()}
            style={{ ...inputStyle, maxWidth: '200px' }}
            required
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t.excerpt}</label>
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder={t.excerptPlaceholder}
            style={inputStyle}
            required
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t.story}</label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder={t.storyPlaceholder}
            rows={10}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'monospace',
            }}
            required
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>{t.tags}</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder={t.tagsPlaceholder}
            style={inputStyle}
          />
        </div>

        <div
          style={{
            ...fieldStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <input
            type="checkbox"
            id="featured"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            style={{ width: '1.1rem', height: '1.1rem' }}
          />
          <label
            htmlFor="featured"
            style={{
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            {t.featured}
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.75rem 2rem',
            background: submitting ? '#999' : 'var(--secid-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  );
}
