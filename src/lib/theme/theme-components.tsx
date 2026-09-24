import React, { useState, useEffect } from 'react';
import { getThemeManager } from './theme-manager';

/**
 * Theme React Components
 * React components for theme management
 */

import type { Theme } from './theme-manager';

export function useTheme() {
  const manager = getThemeManager();
  const [theme, setTheme] = useState(manager.getTheme());
  const [actualTheme, setActualTheme] = useState(manager.getActualTheme());

  useEffect(() => {
    const unsubscribe = manager.subscribe((newTheme, newActualTheme) => {
      setTheme(newTheme);
      setActualTheme(newActualTheme);
    });

    return unsubscribe;
  }, [manager]);

  return {
    theme,
    actualTheme,
    setTheme: (newTheme: Theme) => manager.setTheme(newTheme),
    toggleTheme: () => manager.toggleTheme(),
    cycleTheme: () => manager.cycleTheme(),
    isSystemTheme: () => manager.isSystemTheme(),
    getSystemTheme: () => manager.getSystemTheme(),
  };
}

export const ThemeToggle: React.FC<{
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'select' | 'cycle';
}> = ({ className = '', showLabel = false, variant = 'button' }) => {
  const { theme, actualTheme, setTheme, toggleTheme, cycleTheme } = useTheme();

  if (variant === 'select') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <label className="text-sm font-medium">Theme:</label>}
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
    );
  }

  if (variant === 'cycle') {
    return (
      <button
        onClick={cycleTheme}
        className={`flex items-center space-x-2 rounded-md px-3 py-2 transition-colors ${className}`}
        title={`Current theme: ${theme}`}
      >
        <span className="text-sm">
          {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
        </span>
        {showLabel && <span className="text-sm font-medium">{theme}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center space-x-2 rounded-md px-3 py-2 transition-colors ${className}`}
      title="Toggle theme"
    >
      <span className="text-lg">{actualTheme === 'light' ? '🌙' : '☀️'}</span>
      {showLabel && (
        <span className="text-sm font-medium">
          {actualTheme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
