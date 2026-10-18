/**
 * Keyboard Shortcuts System
 * Provides comprehensive keyboard navigation and shortcuts for the SECiD platform
 */

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: () => void;
  condition?: () => boolean;
  preventDefault?: boolean;
  global?: boolean; // Available globally or only in specific contexts
}

export interface ShortcutCategory {
  id: string;
  name: string;
  description: string;
  shortcuts: KeyboardShortcut[];
}

class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private activeKeys: Set<string> = new Set();
  private isEnabled = true;
  private helpModalOpen = false;

  constructor() {
    this.setupEventListeners();
    this.registerDefaultShortcuts();
  }

  private setupEventListeners(): void {
    document['addEventListener']('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Prevent shortcuts when typing in form fields
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        this.isEnabled = false;
      }
    });

    document.addEventListener('focusout', () => {
      this.isEnabled = true;
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const key = this.normalizeKey(event);
    this.activeKeys.add(key);

    // Check for matching shortcuts
    this.checkShortcuts(event);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = this.normalizeKey(event);
    this.activeKeys.delete(key);
  }

  private normalizeKey(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) parts.push('cmd');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // Handle special keys
    const specialKeys: Record<string, string> = {
      ' ': 'space',
      Escape: 'esc',
      Enter: 'enter',
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Backspace: 'backspace',
      Delete: 'delete',
      Tab: 'tab',
    };

    const key = specialKeys[event.key] || event.key.toLowerCase();
    parts.push(key);

    return parts.join('+');
  }

  private checkShortcuts(event: KeyboardEvent): void {
    for (const shortcut of this.shortcuts.values()) {
      if (this.matchesShortcut(shortcut, event)) {
        if (shortcut.condition && !shortcut.condition()) continue;

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        shortcut.action();
        break;
      }
    }
  }

  private matchesShortcut(
    shortcut: KeyboardShortcut,
    event: KeyboardEvent
  ): boolean {
    const currentKey = this.normalizeKey(event);
    return shortcut.keys.some((key) => key === currentKey);
  }

  private registerDefaultShortcuts(): void {
    // Navigation shortcuts
    this.register({
      id: 'search-focus',
      keys: ['cmd+k', 'ctrl+k'],
      description: 'Focus search bar',
      category: 'navigation',
      action: () => this.focusSearch(),
      global: true,
    });

    this.register({
      id: 'home',
      keys: ['g+h'],
      description: 'Go to homepage',
      category: 'navigation',
      action: () => this.navigateTo('/'),
      global: true,
    });

    this.register({
      id: 'dashboard',
      keys: ['g+d'],
      description: 'Go to dashboard',
      category: 'navigation',
      action: () => this.navigateTo('/dashboard'),
      global: true,
    });

    this.register({
      id: 'jobs',
      keys: ['g+j'],
      description: 'Go to jobs',
      category: 'navigation',
      action: () => this.navigateTo('/jobs'),
      global: true,
    });

    this.register({
      id: 'events',
      keys: ['g+e'],
      description: 'Go to events',
      category: 'navigation',
      action: () => this.navigateTo('/events'),
      global: true,
    });

    this.register({
      id: 'members',
      keys: ['g+m'],
      description: 'Go to members',
      category: 'navigation',
      action: () => this.navigateTo('/members'),
      global: true,
    });

    this.register({
      id: 'forums',
      keys: ['g+f'],
      description: 'Go to forums',
      category: 'navigation',
      action: () => this.navigateTo('/forum'),
      global: true,
    });

    this.register({
      id: 'profile',
      keys: ['g+p'],
      description: 'Go to profile',
      category: 'navigation',
      action: () => this.navigateTo('/profile'),
      global: true,
    });

    // Help and assistance
    this.register({
      id: 'help',
      keys: ['?', 'h+h'],
      description: 'Show keyboard shortcuts',
      category: 'help',
      action: () => this.showHelpModal(),
      global: true,
    });

    this.register({
      id: 'help-center',
      keys: ['g+slash'],
      description: 'Go to help center',
      category: 'help',
      action: () => this.navigateTo('/help'),
      global: true,
    });

    // Quick actions
    this.register({
      id: 'quick-post-job',
      keys: ['c+j'],
      description: 'Create new job posting',
      category: 'quick-actions',
      action: () => this.navigateTo('/jobs/new'),
      condition: () => this.hasPermission('create-job'),
    });

    this.register({
      id: 'quick-create-event',
      keys: ['c+e'],
      description: 'Create new event',
      category: 'quick-actions',
      action: () => this.navigateTo('/events/new'),
      condition: () => this.hasPermission('create-event'),
    });

    this.register({
      id: 'quick-new-post',
      keys: ['c+p'],
      description: 'Create new forum post',
      category: 'quick-actions',
      action: () => this.navigateTo('/forum/new'),
      global: true,
    });

    // Accessibility
    this.register({
      id: 'skip-to-content',
      keys: ['alt+1'],
      description: 'Skip to main content',
      category: 'accessibility',
      action: () => this.skipToContent(),
      global: true,
    });

    this.register({
      id: 'skip-to-navigation',
      keys: ['alt+2'],
      description: 'Skip to navigation',
      category: 'accessibility',
      action: () => this.skipToNavigation(),
      global: true,
    });

    this.register({
      id: 'toggle-high-contrast',
      keys: ['alt+c'],
      description: 'Toggle high contrast mode',
      category: 'accessibility',
      action: () => this.toggleHighContrast(),
      global: true,
    });

    // Application control
    this.register({
      id: 'refresh',
      keys: ['cmd+r', 'ctrl+r', 'f5'],
      description: 'Refresh page',
      category: 'application',
      action: () => window.location.reload(),
      preventDefault: false,
      global: true,
    });

    this.register({
      id: 'close-modal',
      keys: ['esc'],
      description: 'Close modal/dialog',
      category: 'application',
      action: () => this.closeModal(),
      global: true,
    });

    // Developer shortcuts (only in development)
    if ((process.env.NODE_ENV as string) === 'development') {
      this.register({
        id: 'dev-console',
        keys: ['cmd+shift+i', 'ctrl+shift+i', 'f12'],
        description: 'Open developer console',
        category: 'developer',
        action: () => console.log('Developer console shortcut triggered'),
        preventDefault: false,
        global: true,
      });
    }
  }

  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(): ShortcutCategory[] {
    const categories: Map<string, ShortcutCategory> = new Map();

    for (const shortcut of this.shortcuts.values()) {
      if (!categories.has(shortcut.category)) {
        categories.set(shortcut.category, {
          id: shortcut.category,
          name: this.getCategoryName(shortcut.category),
          description: this.getCategoryDescription(shortcut.category),
          shortcuts: [],
        });
      }
      categories.get(shortcut.category)!.shortcuts.push(shortcut);
    }

    return Array.from(categories.values());
  }

  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      navigation: 'Navigation',
      'quick-actions': 'Quick Actions',
      help: 'Help & Support',
      accessibility: 'Accessibility',
      application: 'Application',
      developer: 'Developer',
    };
    return names[category] || category;
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      navigation: 'Navigate between different sections of the platform',
      'quick-actions': 'Quickly create content and perform common actions',
      help: 'Access help and support resources',
      accessibility: 'Improve accessibility and user experience',
      application: 'Control application behavior',
      developer: 'Developer tools and debugging',
    };
    return descriptions[category] || '';
  }

  // Action implementations
  private focusSearch(): void {
    const searchElements = [
      'input[type="search"]',
      '.search-input',
      '[data-search]',
      '#search',
      '.search-bar input',
    ];

    for (const selector of searchElements) {
      const element = document['querySelector'](selector) as HTMLInputElement;
      if (element) {
        element.focus();
        element.select();
        break;
      }
    }
  }

  private navigateTo(path: string): void {
    // Use the router if available, otherwise fallback to window.location
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', path);
      // Trigger navigation event for SPA frameworks
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      window.location.href = path;
    }
  }

  private showHelpModal(): void {
    if (this.helpModalOpen) {
      this.closeHelpModal();
      return;
    }

    this.helpModalOpen = true;
    this.createHelpModal();
  }

  private createHelpModal(): void {
    // Remove existing modal if any
    const existing = document.getElementById('keyboard-shortcuts-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'keyboard-shortcuts-modal';
    modal.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.style.zIndex = '9999';

    const content = document['createElement']('div');
    content.className =
      'bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-96 overflow-hidden';

    const categories = this.getShortcutsByCategory();

    content.innerHTML = `
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button id="close-shortcuts-modal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-80">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${categories
            .map(
              (category) => `
            <div>
              <h3 class="font-semibold text-lg text-gray-900 mb-3">${category['name']}</h3>
              <div class="space-y-2">
                ${category.shortcuts
                  .map(
                    (shortcut) => `
                  <div class="flex justify-between items-center py-1">
                    <span class="text-sm text-gray-700">${shortcut['description']}</span>
                    <div class="flex space-x-1">
                      ${shortcut.keys
                        .map(
                          (key) => `
                        <kbd class="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                          ${this.formatKeyForDisplay(key)}
                        </kbd>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      
      <div class="p-6 border-t border-gray-200 bg-gray-50">
        <p class="text-sm text-gray-600">
          Press <kbd class="px-1 py-0.5 bg-gray-200 border border-gray-300 rounded text-xs">?</kbd> 
          or <kbd class="px-1 py-0.5 bg-gray-200 border border-gray-300 rounded text-xs">Esc</kbd> 
          to close this dialog
        </p>
      </div>
    `;

    modal.appendChild(content);
    document['body'].appendChild(modal);

    // Add event listeners
    const closeButton = modal.querySelector('#close-shortcuts-modal');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.closeHelpModal());
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeHelpModal();
      }
    });

    // Focus trap
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeHelpModal();
      }
    });

    // Focus the modal
    modal.focus();
  }

  private closeHelpModal(): void {
    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) {
      modal.remove();
    }
    this.helpModalOpen = false;
  }

  private formatKeyForDisplay(key: string): string {
    return key
      .split('+')
      .map((part) => {
        const replacements: Record<string, string> = {
          cmd: '⌘',
          ctrl: 'Ctrl',
          alt: 'Alt',
          shift: 'Shift',
          space: 'Space',
          esc: 'Esc',
          enter: 'Enter',
          up: '↑',
          down: '↓',
          left: '←',
          right: '→',
          slash: '/',
          backspace: '⌫',
          delete: 'Del',
          tab: 'Tab',
        };
        return replacements[part] || part.toUpperCase();
      })
      .join(' + ');
  }

  private skipToContent(): void {
    const contentElements = [
      'main',
      '#main-content',
      '.main-content',
      '[role="main"]',
      '#content',
    ];

    for (const selector of contentElements) {
      const element = document['querySelector'](selector) as HTMLElement;
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth' });
        break;
      }
    }
  }

  private skipToNavigation(): void {
    const navElements = [
      'nav',
      '#navigation',
      '.navigation',
      '[role="navigation"]',
      '.nav-menu',
    ];

    for (const selector of navElements) {
      const element = document['querySelector'](selector) as HTMLElement;
      if (element) {
        const firstFocusable = element.querySelector(
          'a, button, [tabindex="0"]'
        ) as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
        }
        break;
      }
    }
  }

  private toggleHighContrast(): void {
    document.body.classList.toggle('high-contrast');

    // Save preference
    const isHighContrast = document['body'].classList.contains('high-contrast');
    localStorage.setItem('secid-high-contrast', isHighContrast.toString());
  }

  private closeModal(): void {
    // Look for open modals/dialogs and close them
    const modals = document.querySelectorAll(
      '.modal, [role="dialog"], .dialog, .popup'
    );
    for (const modal of modals) {
      const closeButton = modal.querySelector(
        '.close, .modal-close, [data-close]'
      ) as HTMLElement;
      if (closeButton) {
        closeButton.click();
        return;
      }
    }

    // If help modal is open, close it
    if (this.helpModalOpen) {
      this.closeHelpModal();
    }
  }

  private hasPermission(permission: string): boolean {
    // This would typically check user permissions
    // For now, return true for demonstration
    return true;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.shortcuts.clear();

    const modal = document.getElementById('keyboard-shortcuts-modal');
    if (modal) modal.remove();
  }
}

// Singleton instance
let keyboardManager: KeyboardShortcutManager | null = null;

export function getKeyboardManager(): KeyboardShortcutManager {
  if (!keyboardManager) {
    keyboardManager = new KeyboardShortcutManager();
  }
  return keyboardManager;
}

export function initKeyboardShortcuts(): KeyboardShortcutManager {
  return getKeyboardManager();
}

// React hook for keyboard shortcuts
export function useKeyboardShortcuts(shortcuts?: KeyboardShortcut[]) {
  const manager = getKeyboardManager();

  React.useEffect(() => {
    if (shortcuts) {
      shortcuts.forEach((shortcut) => manager.register(shortcut));

      return () => {
        shortcuts.forEach((shortcut) => manager.unregister(shortcut.id));
      };
    }
  }, [shortcuts, manager]);

  return {
    register: (shortcut: KeyboardShortcut) => manager.register(shortcut),
    unregister: (id: string) => manager.unregister(id),
    showHelp: () => manager.showHelpModal(),
    enable: () => manager.enable(),
    disable: () => manager.disable(),
  };
}

export { KeyboardShortcutManager };
export default getKeyboardManager;
