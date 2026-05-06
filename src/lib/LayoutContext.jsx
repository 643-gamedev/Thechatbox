import React, { createContext, useContext, useState, useEffect } from 'react';

const LayoutContext = createContext(null);

const THEME_VARS = {
  green:  { primary: '120 100% 55%', bg: '120 100% 1%', fg: '120 100% 55%', card: '120 100% 3%', border: '120 60% 15%', muted: '120 40% 35%' },
  blue:   { primary: '200 100% 50%', bg: '210 100% 3%', fg: '200 100% 70%', card: '210 100% 5%', border: '210 60% 18%', muted: '210 40% 38%' },
  purple: { primary: '280 100% 69%', bg: '270 60% 3%',  fg: '280 100% 75%', card: '270 60% 5%',  border: '270 50% 18%', muted: '270 40% 40%' },
  orange: { primary: '20 100% 60%',  bg: '20 60% 3%',   fg: '20 100% 70%',  card: '20 60% 5%',   border: '20 50% 18%',  muted: '20 40% 38%'  },
  red:    { primary: '350 100% 60%', bg: '350 60% 3%',  fg: '350 100% 70%', card: '350 60% 5%',  border: '350 50% 18%', muted: '350 40% 38%' },
  white:  { primary: '0 0% 85%',     bg: '0 0% 5%',     fg: '0 0% 85%',     card: '0 0% 8%',     border: '0 0% 20%',    muted: '0 0% 40%'    },
};

function applyTheme(themeId) {
  const vars = THEME_VARS[themeId] || THEME_VARS.green;
  const root = document.documentElement;
  root.style.setProperty('--background', vars.bg);
  root.style.setProperty('--foreground', vars.fg);
  root.style.setProperty('--card', vars.bg);
  root.style.setProperty('--card-foreground', vars.fg);
  root.style.setProperty('--primary', vars.primary);
  root.style.setProperty('--primary-foreground', '0 0% 0%');
  root.style.setProperty('--border', vars.border);
  root.style.setProperty('--input', vars.border);
  root.style.setProperty('--ring', vars.primary);
  root.style.setProperty('--muted-foreground', vars.muted);
  root.style.setProperty('--secondary', vars.bg);
  root.style.setProperty('--sidebar-background', vars.bg);
  root.style.setProperty('--sidebar-foreground', vars.fg);
  root.style.setProperty('--sidebar-border', vars.border);
}

export function LayoutProvider({ children }) {
  const [chatLayout, setChatLayout] = useState(
    () => localStorage.getItem('chatLayout') || 'terminal'
  );
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('uiTheme') || 'green'
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setLayout = (layout) => {
    setChatLayout(layout);
    localStorage.setItem('chatLayout', layout);
  };

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('uiTheme', t);
    applyTheme(t);
  };

  return (
    <LayoutContext.Provider value={{ chatLayout, setLayout, theme, setTheme }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}