import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: (_t) => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'jj_theme_preference';

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || 'system';
    } catch { return 'system'; }
  });

  const resolvedTheme = useMemo(() => {
    return theme === 'system' ? getSystemTheme() : theme;
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [resolvedTheme]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const root = document.documentElement;
      if (media.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    try { media.addEventListener('change', handler); } catch { media.addListener(handler); }
    return () => {
      try { media.removeEventListener('change', handler); } catch { media.removeListener(handler); }
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextResolved = prev === 'system' ? getSystemTheme() : prev;
      return nextResolved === 'dark' ? 'light' : 'dark';
    });
  };

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, toggleTheme }), [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
