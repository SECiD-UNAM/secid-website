import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { sendMessage } from '@/lib/members';

interface MessageModalProps {
  fromUid: string;
  toUid: string;
  toName: string;
  lang?: 'es' | 'en';
  onClose: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  fromUid,
  toUid,
  toName,
  lang = 'es',
  onClose,
}) => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      setSending(true);
      setError(null);
      await sendMessage(fromUid, toUid, content.trim());
      setSent(true);
    } catch {
      setError(lang === 'es' ? 'Error al enviar el mensaje' : 'Error sending message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Mensaje a' : 'Message to'} {toName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {sent ? (
            <div className="text-center py-6">
              <p className="text-green-600 dark:text-green-400 font-medium">
                {lang === 'es' ? 'Mensaje enviado' : 'Message sent'}
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={lang === 'es' ? 'Escribe tu mensaje...' : 'Write your message...'}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={!content.trim() || sending}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending
                    ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                    : (lang === 'es' ? 'Enviar' : 'Send')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
