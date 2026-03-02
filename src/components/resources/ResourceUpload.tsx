import React, { useState, useRef } from 'react';
import { uploadResource } from '@/lib/resources';
import { getCurrentUser } from '@/lib/auth';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * ResourceUpload Component
 * Interface for contributors to upload and submit resources
 */

import type {
  ResourceUploadRequest,
  ResourceCategory,
  ResourceType,
  AccessLevel,
} from '@/types/resource';

interface ResourceUploadProps {
  onSuccess?: (resourceId: string) => void;
  onCancel?: () => void;
}

export default function ResourceUpload({
  onSuccess,
  onCancel,
}: ResourceUploadProps) {
  const t = useTranslations();
  const user = getCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const selectedPreviewRef = useRef<File | null>(null);
  const selectedThumbnailRef = useRef<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ResourceUploadRequest>>({
    title: '',
    description: '',
    summary: '',
    category: 'tutorials',
    type: 'pdf',
    tags: [],
    accessLevel: 'free',
    language: 'es',
    difficulty: 'beginner',
    estimatedTime: '',
    prerequisites: [],
    hasPreview: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [prerequisiteInput, setPrerequisiteInput] = useState('');

  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);

  const [previewInfo, setPreviewInfo] = useState<{
    name: string;
    size: number;
  } | null>(null);

  const [thumbnailInfo, setThumbnailInfo] = useState<{
    name: string;
    size: number;
  } | null>(null);

  if (!user) {
    return (
      <div className="py-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          {t?.auth?.signIn?.title || 'Sign In Required'}
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          {t?.resources?.loginToUpload || 'Please sign in to upload resources.'}
        </p>
        <button
          onClick={() => (window.location.href = '/login')}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
        >
          {t?.auth?.signIn?.button || 'Sign In'}
        </button>
      </div>
    );
  }

  const categories: { value: ResourceCategory; label: string }[] = [
    {
      value: 'tutorials',
      label: t?.resources?.categories?.tutorials || 'Tutorials',
    },
    {
      value: 'templates',
      label: t?.resources?.categories?.templates || 'Templates',
    },
    { value: 'tools', label: t?.resources?.categories?.tools || 'Tools' },
    { value: 'books', label: t?.resources?.categories?.books || 'Books' },
    { value: 'courses', label: t?.resources?.categories?.courses || 'Courses' },
    {
      value: 'datasets',
      label: t?.resources?.categories?.datasets || 'Datasets',
    },
    {
      value: 'research',
      label: t?.resources?.categories?.research || 'Research',
    },
    {
      value: 'documentation',
      label: t?.resources?.categories?.documentation || 'Documentation',
    },
  ];

  const types: { value: ResourceType; label: string }[] = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'jupyter', label: 'Jupyter Notebook' },
    { value: 'python', label: 'Python Script' },
    { value: 'r', label: 'R Script' },
    { value: 'sql', label: 'SQL Script' },
    { value: 'csv', label: 'CSV Data' },
    { value: 'json', label: 'JSON Data' },
    { value: 'xml', label: 'XML Data' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'image', label: 'Image' },
    { value: 'zip', label: 'Archive' },
    { value: 'link', label: 'External Link' },
    { value: 'text', label: 'Text Document' },
  ];

  const accessLevels: { value: AccessLevel; label: string }[] = [
    { value: 'free', label: t?.resources?.accessLevels?.free || 'Free' },
    {
      value: 'member',
      label: t?.resources?.accessLevels?.member || 'Members Only',
    },
    {
      value: 'premium',
      label: t?.resources?.accessLevels?.premium || 'Premium',
    },
    {
      value: 'restricted',
      label: t?.resources?.accessLevels?.restricted || 'Restricted',
    },
  ];

  const difficulties = [
    {
      value: 'beginner',
      label: t?.resources?.difficulty?.beginner || 'Beginner',
    },
    {
      value: 'intermediate',
      label: t?.resources?.difficulty?.intermediate || 'Intermediate',
    },
    {
      value: 'advanced',
      label: t?.resources?.difficulty?.advanced || 'Advanced',
    },
  ];

  const handleInputChange = (
    field: keyof ResourceUploadRequest,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectedFileRef.current = file;
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Auto-detect file type
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension) {
        const typeMap: { [key: string]: ResourceType } = {
          pdf: 'pdf',
          xlsx: 'excel',
          xls: 'excel',
          ipynb: 'jupyter',
          py: 'python',
          r: 'r',
          sql: 'sql',
          csv: 'csv',
          json: 'json',
          xml: 'xml',
          mp4: 'video',
          avi: 'video',
          mov: 'video',
          mp3: 'audio',
          wav: 'audio',
          jpg: 'image',
          jpeg: 'image',
          png: 'image',
          gif: 'image',
          zip: 'zip',
          rar: 'zip',
          txt: 'text',
          md: 'text',
        };

        const detectedType = typeMap[extension];
        if (detectedType) {
          handleInputChange('type', detectedType);
        }
      }
    }
  };

  const handlePreviewFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectedPreviewRef.current = file;
      setPreviewInfo({
        name: file.name,
        size: file.size,
      });
    }
  };

  const handleThumbnailFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      selectedThumbnailRef.current = file;
      setThumbnailInfo({
        name: file.name,
        size: file.size,
      });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData?.tags?.includes(tagInput.trim())) {
      const newTags = [...(formData.tags || []), tagInput.trim()];
      handleInputChange('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = formData?.tags?.filter((tag) => tag !== tagToRemove) || [];
    handleInputChange('tags', newTags);
  };

  const addPrerequisite = () => {
    if (
      prerequisiteInput.trim() &&
      !formData?.prerequisites?.includes(prerequisiteInput.trim())
    ) {
      const newPrereqs = [
        ...(formData.prerequisites || []),
        prerequisiteInput.trim(),
      ];
      handleInputChange('prerequisites', newPrereqs);
      setPrerequisiteInput('');
    }
  };

  const removePrerequisite = (prereqToRemove: string) => {
    const newPrereqs =
      formData?.prerequisites?.filter((prereq) => prereq !== prereqToRemove) ||
      [];
    handleInputChange('prerequisites', newPrereqs);
  };

  const validateForm = (): string | null => {
    if (!formData?.title?.trim())
      return t?.resources?.validation?.titleRequired || 'Title is required';
    if (!formData['description']?.trim())
      return (
        t?.resources?.validation?.descriptionRequired ||
        'Description is required'
      );
    if (!formData?.summary?.trim())
      return t?.resources?.validation?.summaryRequired || 'Summary is required';
    if (!fileInfo || !selectedFileRef.current)
      return t?.resources?.validation?.fileRequired || 'File is required';
    if (!formData?.tags?.length)
      return (
        t?.resources?.validation?.tagsRequired || 'At least one tag is required'
      );

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const file = selectedFileRef.current;
    const previewFile = selectedPreviewRef.current ?? undefined;
    const thumbnailFile = selectedThumbnailRef.current ?? undefined;

    if (!file) return;

    try {
      setLoading(true);

      const uploadRequest: ResourceUploadRequest = {
        ...(formData as ResourceUploadRequest),
        file,
        previewFile,
        thumbnailFile,
      };

      const resourceId = await uploadResource(uploadRequest);

      if (onSuccess) {
        onSuccess(resourceId);
      } else {
        alert(
          t?.resources?.uploadSuccess ||
            'Resource uploaded successfully! It will be reviewed before publication.'
        );
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        summary: '',
        category: 'tutorials',
        type: 'pdf',
        tags: [],
        accessLevel: 'free',
        language: 'es',
        difficulty: 'beginner',
        estimatedTime: '',
        prerequisites: [],
        hasPreview: false,
      });
      setFileInfo(null);
      setPreviewInfo(null);
      setThumbnailInfo(null);
      selectedFileRef.current = null;
      selectedPreviewRef.current = null;
      selectedThumbnailRef.current = null;
      setStep(1);
    } catch (error) {
      console.error('Error uploading resource:', error);
      alert(
        t?.resources?.uploadError ||
          'Error uploading resource. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        {t?.resources?.basicInfo || 'Basic Information'}
      </h3>

      {/* Title */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.resources?.title || 'Title'} *
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          placeholder={
            t?.resources?.titlePlaceholder || 'Enter a descriptive title...'
          }
        />
      </div>

      {/* Summary */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.resources?.summary || 'Summary'} *
        </label>
        <textarea
          value={formData.summary || ''}
          onChange={(e) => handleInputChange('summary', e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          placeholder={
            t?.resources?.summaryPlaceholder ||
            'Brief summary (1-2 sentences)...'
          }
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.resources?.description || 'Description'} *
        </label>
        <textarea
          value={formData['description'] || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          placeholder={
            t?.resources?.descriptionPlaceholder ||
            'Detailed description of the resource...'
          }
        />
      </div>

      {/* Category and Type */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t?.resources?.category || 'Category'} *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t?.resources?.type || 'Type'} *
          </label>
          <select
            value={formData['type']}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        {t?.resources?.fileUpload || 'File Upload'}
      </h3>

      {/* Main File */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.resources?.mainFile || 'Main File'} *
        </label>
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.xlsx,.xls,.ipynb,.py,.r,.sql,.csv,.json,.xml,.mp4,.avi,.mov,.mp3,.wav,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt,.md"
          />
          {!fileInfo ? (
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t?.resources?.dragDropFile ||
                  'Drag and drop your file here, or'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef?.current?.click()}
                className="mt-2 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
              >
                {t?.resources?.browseFiles || 'browse files'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{fileInfo['name']}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(fileInfo.size)}
                </p>
              </div>
              <button
                onClick={() => {
                  setFileInfo(null);
                  selectedFileRef.current = null;
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-red-600 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview File */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.hasPreview || false}
            onChange={(e) => handleInputChange('hasPreview', e.target.checked)}
            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t?.resources?.includePreview || 'Include Preview File'}
          </label>
        </div>

        {formData.hasPreview && (
          <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
            <input
              ref={previewInputRef}
              type="file"
              onChange={handlePreviewFileSelect}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.gif"
            />
            {!previewInfo ? (
              <button
                type="button"
                onClick={() => previewInputRef?.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-center text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              >
                {t?.resources?.selectPreviewFile || 'Select Preview File'}
              </button>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{previewInfo['name']}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(previewInfo.size)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPreviewInfo(null);
                    if (previewInputRef.current)
                      previewInputRef.current.value = '';
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.resources?.thumbnail || 'Thumbnail'} (
          {t?.common?.optional || 'Optional'})
        </label>
        <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-4">
          <input
            ref={thumbnailInputRef}
            type="file"
            onChange={handleThumbnailFileSelect}
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif"
          />
          {!thumbnailInfo ? (
            <button
              type="button"
              onClick={() => thumbnailInputRef?.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-center text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
            >
              {t?.resources?.selectThumbnail || 'Select Thumbnail Image'}
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{thumbnailInfo['name']}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(thumbnailInfo.size)}
                </p>
              </div>
              <button
                onClick={() => {
                  setThumbnailInfo(null);
                  if (thumbnailInputRef.current)
                    thumbnailInputRef.current.value = '';
                }}
                className="text-red-600 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        {t?.resources?.metadata || 'Metadata'}
      </h3>

      {/* Tags */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.resources?.tags || 'Tags'} *
        </label>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && (e.preventDefault(), addTag())
            }
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
            placeholder={t?.resources?.addTag || 'Add a tag...'}
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {t?.common?.add || 'Add'}
          </button>
        </div>
        {formData.tags && formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm text-blue-700 dark:text-blue-400"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Access Level and Language */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t?.resources?.accessLevel || 'Access Level'}
          </label>
          <select
            value={formData.accessLevel}
            onChange={(e) => handleInputChange('accessLevel', e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            {accessLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t?.resources?.language || 'Language'}
          </label>
          <select
            value={formData.language}
            onChange={(e) => handleInputChange('language', e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="es">{t?.languages?.spanish || 'Spanish'}</option>
            <option value="en">{t?.languages?.english || 'English'}</option>
            <option value="both">
              {t?.resources?.bilingual || 'Bilingual'}
            </option>
          </select>
        </div>
      </div>

      {/* Difficulty and Estimated Time */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t?.resources?.difficulty?.title || 'Difficulty'}
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => handleInputChange('difficulty', e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            {difficulties.map((diff) => (
              <option key={diff.value} value={diff.value}>
                {diff.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t?.resources?.estimatedTime || 'Estimated Time'} (
            {t?.common?.optional || 'Optional'})
          </label>
          <input
            type="text"
            value={formData.estimatedTime || ''}
            onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 2 hours, 1 week"
          />
        </div>
      </div>

      {/* Prerequisites */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t?.resources?.prerequisites || 'Prerequisites'} (
          {t?.common?.optional || 'Optional'})
        </label>
        <div className="mb-2 flex gap-2">
          <input
            type="text"
            value={prerequisiteInput}
            onChange={(e) => setPrerequisiteInput(e.target.value)}
            onKeyPress={(e) =>
              e.key === 'Enter' && (e.preventDefault(), addPrerequisite())
            }
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
            placeholder={
              t?.resources?.addPrerequisite || 'Add a prerequisite...'
            }
          />
          <button
            type="button"
            onClick={addPrerequisite}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
          >
            {t?.common?.add || 'Add'}
          </button>
        </div>
        {formData.prerequisites && formData.prerequisites.length > 0 && (
          <div className="space-y-1">
            {formData.prerequisites.map((prereq, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded bg-gray-100 dark:bg-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300"
              >
                <span>{prereq}</span>
                <button
                  onClick={() => removePrerequisite(prereq)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t?.resources?.uploadResource || 'Upload Resource'}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center">
        {[1, 2, 3].map((stepNumber) => (
          <React.Fragment key={stepNumber}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step >= stepNumber
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {stepNumber}
            </div>
            {stepNumber < 3 && (
              <div
                className={`mx-2 h-1 w-16 ${
                  step > stepNumber ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {/* Navigation */}
      <div className="mt-8 flex justify-between border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t?.common?.previous || 'Previous'}
        </button>

        <div className="space-x-2">
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              {t?.common?.next || 'Next'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  {t?.resources?.uploading || 'Uploading...'}
                </>
              ) : (
                t?.resources?.submitForReview || 'Submit for Review'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Upload Notice */}
      <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          {t?.resources?.uploadNotice ||
            'Your resource will be reviewed by our team before being published. You will be notified once the review is complete.'}
        </p>
      </div>
    </div>
  );
}
