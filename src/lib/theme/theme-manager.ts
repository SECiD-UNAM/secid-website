/**
 * Theme Manager
 * Handles dark/light theme switching with persistence and system preference detection
 */

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  defaultTheme: Theme;
  storageKey: string;
  enableTransitions: boolean;
  enableSystemDetection: boolean;
  cssVariables: boolean;
}

export interface ThemeColors {
  light: Record<string, string>;
  dark: Record<string, string>;
}

class ThemeManager {
  private currentTheme: Theme;
  private actualTheme: 'light' | 'dark';
  private config: ThemeConfig;
  private mediaQuery: MediaQueryList | null = null;
  private listeners: Set<
    (theme: Theme, actualTheme: 'light' | 'dark') => void
  > = new Set();

  constructor(config: Partial<ThemeConfig> = {}) {
    this.config = {
      defaultTheme: 'system',
      storageKey: 'secid-theme',
      enableTransitions: true,
      enableSystemDetection: true,
      cssVariables: true,
      ...config,
    };

    this.currentTheme = this.getStoredTheme() || this.config.defaultTheme;
    this.actualTheme = this.resolveActualTheme(this.currentTheme);

    this.init();
  }

  private init(): void {
    // Setup system theme detection
    if (this.config.enableSystemDetection && typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener(
        'change',
        this.handleSystemThemeChange.bind(this)
      );
    }

    // Apply initial theme
    this.applyTheme(this.actualTheme);

    // Setup transition handling
    if (this.config.enableTransitions) {
      this.setupTransitions();
    }

    // Setup CSS variables if enabled
    if (this.config.cssVariables) {
      this.updateCSSVariables(this.actualTheme);
    }
  }

  private getStoredTheme(): Theme | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as Theme;
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }

    return null;
  }

  private storeTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.config.storageKey, theme);
    } catch (error) {
      console.warn('Failed to store theme in localStorage:', error);
    }
  }

  private resolveActualTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return 'light'; // Fallback
    }
    return theme;
  }

  private handleSystemThemeChange(): void {
    if (this.currentTheme === 'system') {
      const newActualTheme = this.resolveActualTheme('system');
      if (newActualTheme !== this.actualTheme) {
        this.actualTheme = newActualTheme;
        this.applyTheme(this.actualTheme);
        this.updateCSSVariables(this.actualTheme);
        this.notifyListeners();
      }
    }
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;

    // Update document classes
    document['documentElement'].classList.remove('light', 'dark');
    document['documentElement'].classList.add(theme);

    // Update data attribute for CSS targeting
    document['documentElement'].setAttribute('data-theme', theme);

    // Update color-scheme for native elements
    document['documentElement'].style.colorScheme = theme;

    // Apply to body as well for legacy compatibility
    document['body'].classList.remove('light', 'dark');
    document['body'].classList.add(theme);
  }

  private setupTransitions(): void {
    if (typeof document === 'undefined') return;

    const style = document['createElement']('style');
    style.textContent = `
      *, *::before, *::after {
        transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
      }
    `;

    document.head.appendChild(style);

    // Remove transition styles after a short delay to avoid affecting initial animations
    setTimeout(() => {
      style.remove();
    }, 300);
  }

  private updateCSSVariables(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;

    const colors = this.getThemeColors();
    const themeColors = colors[theme];

    Object.entries(themeColors).forEach(([property, value]) => {
      document.documentElement.style.setProperty(`--color-${property}`, value);
    });
  }

  private getThemeColors(): ThemeColors {
    return {
      light: {
        // Background colors
        'bg-primary': '#ffffff',
        'bg-secondary': '#f8fafc',
        'bg-tertiary': '#f1f5f9',
        'bg-accent': '#e2e8f0',

        // Text colors
        'text-primary': '#1e293b',
        'text-secondary': '#475569',
        'text-tertiary': '#64748b',
        'text-muted': '#94a3b8',

        // Border colors
        'border-primary': '#e2e8f0',
        'border-secondary': '#cbd5e1',
        'border-accent': '#94a3b8',

        // Brand colors
        primary: '#3b82f6',
        'primary-dark': '#2563eb',
        'primary-light': '#60a5fa',

        // State colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4',

        // Surface colors
        surface: '#ffffff',
        'surface-elevated': '#ffffff',
        overlay: 'rgba(0, 0, 0, 0.5)',
      },

      dark: {
        // Background colors
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#334155',
        'bg-accent': '#475569',

        // Text colors
        'text-primary': '#f8fafc',
        'text-secondary': '#e2e8f0',
        'text-tertiary': '#cbd5e1',
        'text-muted': '#94a3b8',

        // Border colors
        'border-primary': '#334155',
        'border-secondary': '#475569',
        'border-accent': '#64748b',

        // Brand colors
        primary: '#60a5fa',
        'primary-dark': '#3b82f6',
        'primary-light': '#93c5fd',

        // State colors
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#22d3ee',

        // Surface colors
        surface: '#1e293b',
        'surface-elevated': '#334155',
        overlay: 'rgba(0, 0, 0, 0.8)',
      },
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentTheme, this.actualTheme);
      } catch (error) {
        console.error('Theme listener error:', error);
      }
    });
  }

  // Public API
  setTheme(theme: Theme): void {
    if (!['light', 'dark', 'system'].includes(theme)) {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }

    this.currentTheme = theme;
    this.actualTheme = this.resolveActualTheme(theme);

    this.storeTheme(theme);
    this.applyTheme(this.actualTheme);

    if (this.config.cssVariables) {
      this.updateCSSVariables(this.actualTheme);
    }

    this.notifyListeners();
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  getActualTheme(): 'light' | 'dark' {
    return this.actualTheme;
  }

  toggleTheme(): void {
    const newTheme = this.actualTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  cycleTheme(): void {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  subscribe(
    listener: (theme: Theme, actualTheme: 'light' | 'dark') => void
  ): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  isDarkMode(): boolean {
    return this.actualTheme === 'dark';
  }

  isLightMode(): boolean {
    return this.actualTheme === 'light';
  }

  isSystemTheme(): boolean {
    return this.currentTheme === 'system';
  }

  getSystemPreference(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }

  // Accessibility features
  enableHighContrast(): void {
    if (typeof document === 'undefined') return;
    document['documentElement'].classList.add('high-contrast');
    localStorage.setItem('secid-high-contrast', 'true');
  }

  disableHighContrast(): void {
    if (typeof document === 'undefined') return;
    document['documentElement'].classList.remove('high-contrast');
    localStorage.setItem('secid-high-contrast', 'false');
  }

  toggleHighContrast(): void {
    if (typeof document === 'undefined') return;
    const isEnabled =
      document['documentElement'].classList.contains('high-contrast');
    if (isEnabled) {
      this.disableHighContrast();
    } else {
      this.enableHighContrast();
    }
  }

  isHighContrastEnabled(): boolean {
    if (typeof document === 'undefined') return false;
    return document['documentElement'].classList.contains('high-contrast');
  }

  // Load high contrast setting
  loadHighContrastSetting(): void {
    if (typeof window === 'undefined') return;

    try {
      const setting = localStorage.getItem('secid-high-contrast');
      if (setting === 'true') {
        this.enableHighContrast();
      }
    } catch (error) {
      console.warn('Failed to load high contrast setting:', error);
    }
  }

  // Font size management
  increaseFontSize(): void {
    if (typeof document === 'undefined') return;

    const currentSize = parseInt(
      getComputedStyle(document['documentElement']).fontSize
    );
    const newSize = Math.min(currentSize + 2, 24); // Max 24px
    document['documentElement'].style.fontSize = `${newSize}px`;
    localStorage.setItem('secid-font-size', newSize.toString());
  }

  decreaseFontSize(): void {
    if (typeof document === 'undefined') return;

    const currentSize = parseInt(
      getComputedStyle(document['documentElement']).fontSize
    );
    const newSize = Math.max(currentSize - 2, 12); // Min 12px
    document['documentElement'].style.fontSize = `${newSize}px`;
    localStorage.setItem('secid-font-size', newSize.toString());
  }

  resetFontSize(): void {
    if (typeof document === 'undefined') return;

    document['documentElement'].style.fontSize = '';
    localStorage.removeItem('secid-font-size');
  }

  loadFontSizeSetting(): void {
    if (typeof window === 'undefined') return;

    try {
      const setting = localStorage.getItem('secid-font-size');
      if (setting) {
        document['documentElement'].style.fontSize = `${setting}px`;
      }
    } catch (error) {
      console.warn('Failed to load font size setting:', error);
    }
  }

  // Reduced motion
  enableReducedMotion(): void {
    if (typeof document === 'undefined') return;
    document['documentElement'].classList.add('reduce-motion');
    localStorage.setItem('secid-reduce-motion', 'true');
  }

  disableReducedMotion(): void {
    if (typeof document === 'undefined') return;
    document['documentElement'].classList.remove('reduce-motion');
    localStorage.setItem('secid-reduce-motion', 'false');
  }

  loadReducedMotionSetting(): void {
    if (typeof window === 'undefined') return;

    try {
      const setting = localStorage.getItem('secid-reduce-motion');
      if (setting === 'true') {
        this.enableReducedMotion();
      } else if (setting === null && window.matchMedia) {
        // Check system preference
        const prefersReducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches;
        if (prefersReducedMotion) {
          this.enableReducedMotion();
        }
      }
    } catch (error) {
      console.warn('Failed to load reduced motion setting:', error);
    }
  }

  // Initialize all accessibility settings
  initAccessibilitySettings(): void {
    this.loadHighContrastSetting();
    this.loadFontSizeSetting();
    this.loadReducedMotionSetting();
  }

  destroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeListener(this.handleSystemThemeChange);
    }
    this.listeners.clear();
  }
}

// Singleton instance
let themeManager: ThemeManager | null = null;

export function getThemeManager(config?: Partial<ThemeConfig>): ThemeManager {
  if (!themeManager) {
    themeManager = new ThemeManager(config);
  }
  return themeManager;
}

export function initTheme(config?: Partial<ThemeConfig>): ThemeManager {
  const manager = getThemeManager(config);
  manager.initAccessibilitySettings();
  return manager;
}

// React components have been moved to theme-components.tsx
// Import { useTheme, ThemeToggle } from './theme-components' in React components

export { ThemeManager };
export default getThemeManager;
