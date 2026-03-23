import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Bug, Lightbulb, MessageSquare } from 'lucide-react';

const REPO_URL = 'https://github.com/SECiD-UNAM/secid-website';

interface FeedbackOption {
  key: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  template: string;
}

const options: FeedbackOption[] = [
  {
    key: 'bug',
    icon: <Bug className="h-5 w-5 text-red-500" />,
    label: 'Report a Bug',
    description: "Something isn't working",
    template: 'bug_report.yml',
  },
  {
    key: 'feature',
    icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
    label: 'Request a Feature',
    description: 'Suggest an improvement',
    template: 'feature_request.yml',
  },
  {
    key: 'feedback',
    icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
    label: 'General Feedback',
    description: 'Share your thoughts',
    template: 'general_feedback.yml',
  },
];

function buildIssueUrl(template: string): string {
  const pageUrl = window.location.href;
  const browser = navigator.userAgent;

  const params = new URLSearchParams({
    template,
    'page-url': pageUrl,
    browser,
  });

  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export default function FeedbackFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  function handleOptionClick(template: string) {
    window.open(buildIssueUrl(template), '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-90">
      {/* Popover menu */}
      <div
        className={`absolute bottom-16 right-0 w-72 origin-bottom-right transition-all duration-200 ${
          isOpen
            ? 'scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0'
        }`}
        role="menu"
        aria-label="Feedback options"
      >
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              How can we help?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose a category to open a GitHub issue
            </p>
          </div>

          {/* Options */}
          <div className="p-1.5">
            {options.map((opt) => (
              <button
                key={opt.key}
                role="menuitem"
                onClick={() => handleOptionClick(opt.template)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  {opt.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close feedback menu' : 'Send feedback'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="group flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 transition-all duration-200 hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-gray-900"
      >
        <MessageCircle
          className={`h-6 w-6 transition-all duration-200 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        />
        <X
          className={`absolute h-6 w-6 transition-all duration-200 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
        />
      </button>
    </div>
  );
}
