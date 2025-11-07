/**
 * Theme Utility for Dark/Light Mode
 *
 * Features:
 * - Respects system preference (prefers-color-scheme)
 * - Persists user choice in localStorage
 * - Smooth transitions between themes
 * - Type-safe theme management
 */

export type Theme = 'light' | 'dark';

/**
 * Get the current theme from localStorage or system preference
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'; // Server-side default
  }

  // Check localStorage first
  const storedTheme = localStorage.getItem('theme') as Theme | null;
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  // Fall back to system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Set the theme and persist to localStorage
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;

  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  localStorage.setItem('theme', theme);

  // Dispatch custom event for theme change
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): void {
  const currentTheme = getTheme();
  const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

/**
 * Initialize theme on page load
 * This should be called as early as possible to prevent flash of wrong theme
 */
export function initTheme(): void {
  if (typeof window === 'undefined') return;

  const theme = getTheme();
  setTheme(theme);

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    // Only update if user hasn't set a preference
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}

/**
 * Inline script to prevent flash of wrong theme
 * This should be injected in <head> before any visible content
 */
export const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = theme === 'dark' || (!theme && prefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  })();
`;
