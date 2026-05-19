import React, { useState, useCallback } from 'react';
import { PlusIcon, StarIcon, LinkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import type { FormData } from '../profile-edit-types';
import type { ProjectShowcase } from '@/types/member';
import { EntryCard } from '../shared/EntryCard';
import { TagInput } from '../shared/TagInput';
import { SUGGESTED_SKILLS } from '../profile-edit-types';

interface PortfolioTabProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  lang: 'es' | 'en';
}

const MAX_PROJECTS = 20;

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 ' +
  'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const CATEGORIES: Record<
  ProjectShowcase['category'],
  { es: string; en: string }
> = {
  'machine-learning': { es: 'Machine Learning', en: 'Machine Learning' },
  'data-analysis': { es: 'Análisis de Datos', en: 'Data Analysis' },
  'web-development': { es: 'Desarrollo Web', en: 'Web Development' },
  research: { es: 'Investigación', en: 'Research' },
  other: { es: 'Otro', en: 'Other' },
};

const CATEGORY_BADGE_COLORS: Record<ProjectShowcase['category'], string> = {
  'machine-learning':
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'data-analysis':
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'web-development':
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  research: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

function createEmptyProject(): ProjectShowcase {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    technologies: [],
    category: 'other',
    featured: false,
    createdAt: new Date(),
  };
}

function sortProjects(projects: ProjectShowcase[]): ProjectShowcase[] {
  return [...projects].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    const dateA =
      a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB =
      b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });
}

function truncateDescription(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({
  formData,
  setFormData,
  lang,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<ProjectShowcase | null>(null);

  const sortedProjects = sortProjects(formData.projects);

  const updateProjects = useCallback(
    (updater: (entries: ProjectShowcase[]) => ProjectShowcase[]) => {
      setFormData((prev) => ({
        ...prev,
        projects: updater(prev.projects),
      }));
    },
    [setFormData]
  );

  const handleAddProject = () => {
    if (formData.projects.length >= MAX_PROJECTS) return;
    const entry = createEmptyProject();
    setDraftEntry(entry);
    setEditingId(entry.id);
    updateProjects((entries) => [entry, ...entries]);
  };

  const handleSaveEntry = () => {
    if (!draftEntry) return;
    updateProjects((entries) =>
      entries.map((e) => (e.id === draftEntry.id ? draftEntry : e))
    );
    setEditingId(null);
    setDraftEntry(null);
  };

  const handleCancelEntry = () => {
    if (!draftEntry) return;
    const isNew = formData.projects.some(
      (e) => e.id === draftEntry.id && e.title === '' && e.description === ''
    );
    if (isNew) {
      updateProjects((entries) =>
        entries.filter((e) => e.id !== draftEntry.id)
      );
    }
    setEditingId(null);
    setDraftEntry(null);
  };

  const handleEditEntry = (entry: ProjectShowcase) => {
    setDraftEntry({ ...entry });
    setEditingId(entry.id);
  };

  const handleDeleteEntry = (id: string) => {
    updateProjects((entries) => entries.filter((e) => e.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraftEntry(null);
    }
  };

  const updateDraft = (updates: Partial<ProjectShowcase>) => {
    if (!draftEntry) return;
    setDraftEntry({ ...draftEntry, ...updates });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? 'Portafolio de Proyectos' : 'Project Portfolio'}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formData.projects.length}/{MAX_PROJECTS}
        </span>
      </div>

      {formData.projects.length < MAX_PROJECTS && !editingId && (
        <button
          type="button"
          onClick={handleAddProject}
          className={
            'flex items-center gap-2 rounded-lg border-2 border-dashed ' +
            'border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 ' +
            'hover:border-primary-400 hover:text-primary-600 ' +
            'dark:border-gray-600 dark:text-gray-400 ' +
            'dark:hover:border-primary-500 dark:hover:text-primary-400 ' +
            'w-full justify-center transition-colors'
          }
        >
          <PlusIcon className="h-5 w-5" />
          {lang === 'es' ? 'Agregar Proyecto' : 'Add Project'}
        </button>
      )}

      {/* Editing entry (full width) */}
      {editingId && draftEntry && (
        <EntryCard
          title={
            draftEntry.title ||
            (lang === 'es' ? 'Nuevo Proyecto' : 'New Project')
          }
          isEditing={true}
          onEdit={() => {}}
          onDelete={() => handleDeleteEntry(draftEntry.id)}
          onSave={handleSaveEntry}
          onCancel={handleCancelEntry}
          lang={lang}
        >
          <ProjectEntryForm
            entry={draftEntry}
            onUpdate={updateDraft}
            lang={lang}
          />
        </EntryCard>
      )}

      {/* View mode: 2-column grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sortedProjects
          .filter((entry) => entry.id !== editingId)
          .map((entry) => (
            <ProjectCard
              key={entry.id}
              project={entry}
              onEdit={() => handleEditEntry(entry)}
              onDelete={() => handleDeleteEntry(entry.id)}
              lang={lang}
            />
          ))}
      </div>

      {formData.projects.length === 0 && !editingId && (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {lang === 'es'
            ? 'Aun no has agregado proyectos a tu portafolio.'
            : 'You have not added any projects to your portfolio yet.'}
        </p>
      )}
    </div>
  );
};

/**
 * View-mode card displaying a single project in the grid.
 */
const ProjectCard: React.FC<{
  project: ProjectShowcase;
  onEdit: () => void;
  onDelete: () => void;
  lang: 'es' | 'en';
}> = ({ project, onEdit, onDelete, lang }) => {
  const categoryLabel =
    CATEGORIES[project.category]?.[lang] ?? project.category;
  const badgeColor =
    CATEGORY_BADGE_COLORS[project.category] ?? CATEGORY_BADGE_COLORS.other;

  const handleDelete = () => {
    const message =
      lang === 'es'
        ? 'Estas seguro de que deseas eliminar este proyecto?'
        : 'Are you sure you want to delete this project?';
    if (window.confirm(message)) {
      onDelete();
    }
  };

  return (
    <div className="group relative rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Featured star badge */}
      {project.featured && (
        <div className="absolute right-3 top-3">
          <StarIconSolid
            className="h-5 w-5 text-amber-400"
            aria-label={lang === 'es' ? 'Destacado' : 'Featured'}
          />
        </div>
      )}

      {/* Category badge */}
      <span
        className={
          'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ' +
          badgeColor
        }
      >
        {categoryLabel}
      </span>

      {/* Title */}
      <h4 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
        {project.title || (lang === 'es' ? 'Sin titulo' : 'No title')}
      </h4>

      {/* Description snippet (2 lines) */}
      {project.description && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {truncateDescription(project.description)}
        </p>
      )}

      {/* Technology tags */}
      {project.technologies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {project.technologies.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className={
                'inline-block rounded-full px-2 py-0.5 text-xs ' +
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }
            >
              {tech}
            </span>
          ))}
          {project.technologies.length > 5 && (
            <span className="inline-block px-1 text-xs text-gray-500 dark:text-gray-400">
              +{project.technologies.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Links */}
      {(project.githubUrl || project.liveUrl) && (
        <div className="mt-3 flex items-center gap-3">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              GitHub
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {lang === 'es' ? 'Demo' : 'Live Demo'}
            </a>
          )}
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className={
            'rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ' +
            'dark:hover:bg-gray-700 dark:hover:text-gray-300'
          }
          aria-label={lang === 'es' ? 'Editar' : 'Edit'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={
            'rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 ' +
            'dark:hover:bg-red-900/20 dark:hover:text-red-400'
          }
          aria-label={lang === 'es' ? 'Eliminar' : 'Delete'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * Internal sub-component for editing a project entry.
 * Rendered inside EntryCard when editing.
 */
const ProjectEntryForm: React.FC<{
  entry: ProjectShowcase;
  onUpdate: (updates: Partial<ProjectShowcase>) => void;
  lang: 'es' | 'en';
}> = ({ entry, onUpdate, lang }) => {
  return (
    <>
      {/* Title */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Titulo' : 'Title'} *
        </label>
        <input
          type="text"
          value={entry.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Ej: Modelo de prediccion de demanda'
              : 'Ex: Demand Prediction Model'
          }
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Descripcion' : 'Description'}
        </label>
        <textarea
          value={entry.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className={INPUT_CLASS}
          placeholder={
            lang === 'es'
              ? 'Describe tu proyecto, objetivos y resultados...'
              : 'Describe your project, objectives, and results...'
          }
        />
      </div>

      {/* Category */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Categoria' : 'Category'}
        </label>
        <select
          value={entry.category}
          onChange={(e) =>
            onUpdate({
              category: e.target.value as ProjectShowcase['category'],
            })
          }
          className={INPUT_CLASS}
        >
          {Object.entries(CATEGORIES).map(([value, labels]) => (
            <option key={value} value={value}>
              {labels[lang]}
            </option>
          ))}
        </select>
      </div>

      {/* Technologies */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Tecnologias' : 'Technologies'}
        </label>
        <TagInput
          tags={entry.technologies}
          onChange={(tags) => onUpdate({ technologies: tags })}
          suggestions={SUGGESTED_SKILLS}
          placeholder={
            lang === 'es' ? 'Agregar tecnologia...' : 'Add technology...'
          }
        />
      </div>

      {/* GitHub URL */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          GitHub URL ({lang === 'es' ? 'opcional' : 'optional'})
        </label>
        <input
          type="url"
          value={entry.githubUrl ?? ''}
          onChange={(e) => onUpdate({ githubUrl: e.target.value || undefined })}
          className={INPUT_CLASS}
          placeholder="https://github.com/username/project"
        />
      </div>

      {/* Live demo URL */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'URL de demo' : 'Live Demo URL'} (
          {lang === 'es' ? 'opcional' : 'optional'})
        </label>
        <input
          type="url"
          value={entry.liveUrl ?? ''}
          onChange={(e) => onUpdate({ liveUrl: e.target.value || undefined })}
          className={INPUT_CLASS}
          placeholder="https://my-project.example.com"
        />
      </div>

      {/* Featured toggle */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={entry.featured}
          onChange={(e) => onUpdate({ featured: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
        />
        <StarIcon className="h-4 w-4 text-amber-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {lang === 'es' ? 'Destacado' : 'Featured'}
        </span>
      </label>
    </>
  );
};

export default PortfolioTab;
