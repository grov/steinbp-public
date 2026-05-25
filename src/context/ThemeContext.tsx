import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'dark' | 'matrix' | 'synthwave' | 'blood' | 'amber'

const THEMES: Theme[] = ['dark', 'matrix', 'synthwave', 'blood', 'amber']

export const THEME_META: Record<Theme, { emoji: string; label: string }> = {
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
  theme: 'dark',
  setTheme: () => {},
  cycleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    return (THEMES.includes(stored as Theme) ? stored : 'dark') as Theme
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
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
