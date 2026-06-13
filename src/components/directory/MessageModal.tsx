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
      setError(
        lang === 'es' ? 'Error al enviar el mensaje' : 'Error sending message'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Mensaje a' : 'Message to'} {toName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {sent ? (
            <div className="py-6 text-center">
              <p className="font-medium text-green-600 dark:text-green-400">
                {lang === 'es' ? 'Mensaje enviado' : 'Message sent'}
              </p>
              <button
                onClick={onClose}
                className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-700"
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  lang === 'es'
                    ? 'Escribe tu mensaje...'
                    : 'Write your message...'
                }
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="mt-3 flex justify-end space-x-2">
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={!content.trim() || sending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending
                    ? lang === 'es'
                      ? 'Enviando...'
                      : 'Sending...'
                    : lang === 'es'
                      ? 'Enviar'
                      : 'Send'}
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
