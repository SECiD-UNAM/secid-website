import React, { useState } from 'react';
import { createSpotlight } from '@/lib/spotlights';

interface Props {
  lang?: 'es' | 'en';
}

export default function SpotlightEditor({ lang = 'es' }: Props) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [graduationYear, setGraduationYear] = useState<number>(new Date().getFullYear());
  const [story, setStory] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [featured, setFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const t = {
    es: {
      pageTitle: 'Publicar Historia de Egresado',
      pageDescription: 'Comparte la historia de éxito de un egresado de la comunidad SECiD.',
      name: 'Nombre completo',
      namePlaceholder: 'Ej. María García López',
      title: 'Puesto / Título',
      titlePlaceholder: 'Ej. Senior Data Scientist',
      company: 'Empresa',
      companyPlaceholder: 'Ej. Google',
      graduationYear: 'Año de generación',
      excerpt: 'Resumen corto',
      excerptPlaceholder: 'Una oración que resuma la historia...',
      story: 'Historia (HTML permitido)',
      storyPlaceholder: '<h2>Mi camino</h2><p>Escribe la historia aquí...</p>',
      tags: 'Etiquetas (separadas por comas)',
      tagsPlaceholder: 'Ej. Machine Learning, Google, Liderazgo',
      featured: 'Marcar como destacada',
      submit: 'Publicar Historia',
      submitting: 'Publicando...',
      success: 'Historia publicada exitosamente.',
      error: 'Error al publicar la historia. Intenta de nuevo.',
      back: 'Volver a historias',
      required: 'Este campo es obligatorio.',
    },
    en: {
      pageTitle: 'Publish Alumni Story',
      pageDescription: 'Share the success story of a SECiD alumni community member.',
      name: 'Full name',
      namePlaceholder: 'E.g. María García López',
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
      submit: 'Publish Story',
      submitting: 'Publishing...',
      success: 'Story published successfully.',
      error: 'Error publishing the story. Please try again.',
      back: 'Back to stories',
      required: 'This field is required.',
    },
  }[lang];

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

      setSuccess(true);
      setName('');
      setTitle('');
      setCompany('');
      setGraduationYear(new Date().getFullYear());
      setStory('');
      setExcerpt('');
      setTagsInput('');
      setFeatured(false);
    } catch (err) {
      console.error('Error creating spotlight:', err);
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

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <a
        href={`/${lang}/spotlights`}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', ...fieldStyle }}>
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
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
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

        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="featured"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            style={{ width: '1.1rem', height: '1.1rem' }}
          />
          <label htmlFor="featured" style={{ fontWeight: 500, color: 'var(--color-text-primary)', cursor: 'pointer' }}>
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
