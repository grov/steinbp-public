import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'clair' | 'dark' | 'matrix' | 'synthwave' | 'blood' | 'amber'

const THEMES: Theme[] = ['clair', 'dark', 'matrix', 'synthwave', 'blood', 'amber']
const DEFAULT_THEME: Theme = 'clair'

// Incrémenter pour réappliquer DEFAULT_THEME une fois à tous les appareils
// (le thème choisi est mémorisé dès la première visite).
const THEME_DEFAULT_VERSION = '2'

export const THEME_META: Record<Theme, { emoji: string; label: string }> = {
  clair:     { emoji: '☀️', label: 'Clair'    },
  dark:      { emoji: '🌑', label: 'Dark'     },
  matrix:    { emoji: '🖥️', label: 'Matrix'   },
  synthwave: { emoji: '⚡', label: 'Synth'    },
  blood:     { emoji: '🩸', label: 'Blood'    },
  amber:     { emoji: '🕯️', label: 'Amber'    },
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  cycleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  cycleTheme: () => {},
})

function readStoredTheme(): Theme {
  try {
    if (localStorage.getItem('theme_default_version') !== THEME_DEFAULT_VERSION) return DEFAULT_THEME
    const stored = localStorage.getItem('theme')
    return THEMES.includes(stored as Theme) ? (stored as Theme) : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('theme', theme)
      localStorage.setItem('theme_default_version', THEME_DEFAULT_VERSION)
    } catch {
      // Stockage indisponible (navigation privée) : le thème reste en mémoire.
    }
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
  }

  function cycleTheme() {
    const idx = THEMES.indexOf(theme)
    setThemeState(THEMES[(idx + 1) % THEMES.length])
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
