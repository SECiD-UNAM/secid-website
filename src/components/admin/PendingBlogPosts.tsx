import React, { useState, useEffect, useCallback } from 'react';
import { getBlogPosts, updateBlogPost, type BlogPost } from '@/lib/blog';
import { CheckCircle, XCircle, FileText } from 'lucide-react';

interface Props {
  lang?: 'es' | 'en';
}

const translations = {
  es: {
    title: 'Artículos Pendientes de Revisión',
    noArticles: 'No hay artículos pendientes.',
    approve: 'Aprobar',
    reject: 'Rechazar',
    by: 'por',
    loading: 'Cargando...',
    errorFetch: 'Error al cargar los artículos pendientes.',
    errorAction: 'Error al procesar la acción.',
  },
  en: {
    title: 'Pending Blog Posts',
    noArticles: 'No pending posts.',
    approve: 'Approve',
    reject: 'Reject',
    by: 'by',
    loading: 'Loading...',
    errorFetch: 'Error loading pending posts.',
    errorAction: 'Error processing action.',
  },
};

export default function PendingBlogPosts({ lang = 'es' }: Props) {
  const t = translations[lang];
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getBlogPosts({ status: 'published' });
      setPosts(all.filter((p) => p.moderationStatus === 'pending'));
    } catch (err) {
      console.error('Error fetching pending posts:', err);
      setError(t.errorFetch);
    } finally {
      setLoading(false);
    }
  }, [t.errorFetch]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function handleAction(postId: string, action: 'approved' | 'rejected') {
    setActioningId(postId);
    try {
      await updateBlogPost(postId, { moderationStatus: action });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Error updating post moderation status:', err);
      setError(t.errorAction);
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">{t.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          {lang === 'es' ? '¡Sin artículos pendientes!' : 'No pending posts!'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{t.noArticles}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-white">
                  {post.title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {t.by} {post.authorName}
                  {post.lang && (
                    <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {post.lang.toUpperCase()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => handleAction(post.id, 'approved')}
                disabled={actioningId === post.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-transparent bg-green-600 px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {t.approve}
              </button>
              <button
                onClick={() => handleAction(post.id, 'rejected')}
                disabled={actioningId === post.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <XCircle className="h-4 w-4" />
                {t.reject}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
