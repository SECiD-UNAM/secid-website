import React, { useState, useEffect, useRef } from 'react';
import { 
import { useTranslations} from '../../hooks/useTranslations';
import { forumTopics, forumPosts, forumCategories, forumFiles} from '../../lib/forum';

  Bold, 
  Italic, 
  Link, 
  Image, 
  Code, 
  List, 
  Quote, 
  Eye, 
  EyeOff,
  Upload,
  X,
  FileText,
  AlertCircle,
  Check,
  Hash,
  Paperclip
} from 'lucide-react';
import type { ForumCategory, ForumTopic, Language } from '../../types';

interface ForumPostProps {
  mode: 'create-topic' | 'edit-topic' | 'create-post' | 'edit-post';
  language: Language;
  topicId?: string;
  postId?: string;
  categorySlug?: string;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  onSave?: (id: string) => void;
  onCancel?: () => void;
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

const ForumPost: React.FC<ForumPostProps> = ({ 
  mode, 
  language, 
  topicId, 
  postId, 
  categorySlug, 
  currentUser, 
  onSave, 
  onCancel 
}) => {
  const t = useTranslations(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  
  // Editor state
  const [cursorPosition, setCursorPosition] = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load categories
      const categoriesData = await forumCategories.getAll();
      setCategories(categoriesData);

      // Set default category if provided
      if(categorySlug) {
        const category = categoriesData.find(c => c.slug === categorySlug);
        if(category) {
          setSelectedCategoryId(category.id);
        }
      }

      // Load existing data for edit modes
      if (mode === 'edit-topic' && topicId) {
        const topic = await forumTopics.getById(topicId);
        if(topic) {
          setTitle(topic.title);
          setContent(topic.content);
          setSelectedCategoryId(topic.categoryId);
          setTags(topic.tags);
        }
      } else if (mode === 'edit-post' && postId) {
        const post = await forumPosts.getById(postId);
        if(post) {
          setContent(post.content);
          setAttachments(post.attachments);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode.includes('topic') && !title.trim()) {
      newErrors.title = t.forum.errors.validation.titleRequired;
    }

    if (!content.trim()) {
      newErrors.content = t.forum.errors.validation.contentRequired;
    }

    if (mode === 'create-topic' && !selectedCategoryId) {
      newErrors.category = t.forum.errors.validation.categoryRequired;
    }

    if (title.length > 200) {
      newErrors.title = t.forum.errors.validation.titleTooLong;
    }

    if (content.length > 10000) {
      newErrors.content = t.forum.errors.validation.contentTooLong;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (mode === 'create-topic') {
        const slug = title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        const topicId = await forumTopics.create({
          categoryId: selectedCategoryId,
          title,
          slug: `${slug}-${Date.now()}`,
          content,
          authorId: currentUser.id,
          authorName: currentUser.name,
          isPinned: false,
          isLocked: false,
          isSolved: false,
          tags,
          views: 0,
          postCount: 0,
          upvotes: 0,
          downvotes: 0,
          lastActivity: {
            userId: currentUser.id,
            userName: currentUser['name'],
            timestamp: new Date(),
          }
        });

        onSave?.(topicId);
        
      } else if (mode === 'edit-topic' && topicId) {
        await forumTopics.update(topicId, {
          title,
          content,
          categoryId: selectedCategoryId,
          tags
        });

        onSave?.(topicId);
        
      } else if (mode === 'create-post' && topicId) {
        const postId = await forumPosts.create({
          topicId,
          content,
          htmlContent: processContent(content),
          authorId: currentUser.id,
          authorName: currentUser.name,
          upvotes: 0,
          downvotes: 0,
          reactions: {},
          isEdited: false,
          editHistory: [],
          attachments,
          mentions: extractMentions(content),
          reportCount: 0,
          isReported: false,
          isSolution: false,
          depth: 0,
          childrenCount: 0
        });

        onSave?.(postId);
        
      } else if (mode === 'edit-post' && postId) {
        await forumPosts.update(postId, {
          content,
          htmlContent: processContent(content),
          attachments
        });

        onSave?.(postId);
      }

    } catch (err) {
      console.error('Error saving:', err);
      setErrors({ submit: t.forum.errors.postingFailed });
    } finally {
      setLoading(false);
    }
  };

  const processContent = (content: string): string => {
    // Basic markdown-like processing
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>');
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match?.[1]);
    }
    
    return mentions;
  };

  const insertAtCursor = (text: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    
    setContent(before + text + after);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  const formatText = (format: string) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formattedText = '';
    
    switch(format) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`;
        break;
      case 'code':
        formattedText = selectedText.includes('\n') 
          ? `\`\`\`\n${selectedText || 'code'}\n\`\`\``
          : `\`${selectedText || 'code'}\``;
        break;
      case 'link':
        formattedText = `[${selectedText || 'link text'}](https://example.com)`;
        break;
      case 'quote':
        formattedText = `> ${selectedText || 'quote'}`;
        break;
      case 'list':
        formattedText = `- ${selectedText || 'list item'}`;
        break;
    }
    
    insertAtCursor(formattedText);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setErrors(prev => ({ ...prev, file: 'File size must be less than 10MB' }));
        continue;
      }

      const fileId = `uploading-${Date.now()}-${Math.random()}`;
      setUploadingFiles(prev => [...prev, fileId]);

      try {
        const attachment = await forumFiles.uploadFile(file, currentUser.id, topicId || 'new');
        setAttachments(prev => [...prev, attachment]);
      } catch (err) {
        console.error('Error uploading file:', err);
        setErrors(prev => ({ ...prev, file: 'Failed to upload file' }));
      } finally {
        setUploadingFiles(prev => prev.filter(id => id !== fileId));
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    if(attachment) {
      try {
        await forumFiles.deleteFile(attachment.fileUrl);
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  '); // Insert 2 spaces for tab
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {mode === 'create-topic' && t.forum.topic.createTopic}
            {mode === 'edit-topic' && t.forum.topic.edit}
            {mode === 'create-post' && t.forum.post.writeReply}
            {mode === 'edit-post' && t.forum.post.edit}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title (only for topics) */}
            {mode.includes('topic') && (
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.forum.topic.title} *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.forum.topic.topicTitle}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>
            )}

            {/* Category (only for create topic) */}
            {mode === 'create-topic' && (
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.forum.topic.category} *
                </label>
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{t.forum.topic.selectCategory}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                )}
              </div>
            )}

            {/* Content Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.forum.topic.content} *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPreview ? 'Edit' : t.forum.topic.preview}
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              {!showPreview && (
                <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-t-lg border-b-0">
                  <button
                    type="button"
                    onClick={() => formatText('bold')}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title={t.forum.post.bold}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('italic')}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title={t.forum.post.italic}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('code')}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title={t.forum.post.codeBlock}
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('link')}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title={t.forum.post.link}
                  >
                    <Link className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('quote')}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title={t.forum.post.quote}
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => formatText('list')}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title={t.forum.post.list}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  
                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef?.current?.click()}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title={t.forum.topic.uploadFile}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Content Area */}
              {showPreview ? (
                <div className="min-h-[300px] p-4 border border-gray-300 dark:border-gray-600 rounded-b-lg bg-white dark:bg-gray-700">
                  <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: processContent(content) }} />
                  </div>
                </div>
              ) : (
                <textarea
                  ref={textAreaRef}
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode.includes('topic') ? t.forum.topic.topicContent : t.forum.post.replyPlaceholder}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-b-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-vertical"
                />
              )}
              
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content}</p>
              )}

              <div className="flex justify-between items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{content.length} / 10000 characters</span>
                <div className="text-xs">
                  <span className="font-medium">Formatting:</span> **bold** *italic* `code` [link](url) {'>'}quote
                </div>
              </div>
            </div>

            {/* File Upload Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Attachments */}
            {(attachments.length > 0 || uploadingFiles.length > 0) && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.forum.topic.attachments}
                </h4>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{attachment.fileName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {Math.round(attachment.fileSize / 1024)}KB
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {uploadingFiles.map((fileId) => (
                    <div key={fileId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <Upload className="w-5 h-5 text-blue-500 animate-spin" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">Uploading...</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t.forum.topic.maxFileSize} • {t.forum.topic.allowedTypes}
                </p>
              </div>
            )}

            {/* Tags (only for topics) */}
            {mode.includes('topic') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.forum.topic.tags}
                </label>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                
                {tags.length < 5 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder={t.forum.topic.tagPlaceholder}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!newTag.trim() || tags.includes(newTag.trim())}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Hash className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max 5 tags. Press Enter or click + to add.
                </p>
              </div>
            )}

            {/* Error Messages */}
            {errors.submit && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                {errors.submit}
              </div>
            )}

            {errors.file && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                {errors.file}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading || uploadingFiles.length > 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Upload className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {mode.includes('create') ? t.forum.topic.publish : t.common.save}
              </button>
              
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {t.common.cancel}
                </button>
              )}
              
              <div className="flex-1"></div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t.forum.topic.formatting}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForumPost;