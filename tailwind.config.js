/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f97316', // orange vif — visible en bar
          dark: '#c2410c',
        },
        // Toutes les teintes zinc + white sont pilotées par des CSS variables
        // afin que le changement de thème s'applique automatiquement partout.
        white: 'rgb(var(--color-white) / <alpha-value>)',
        zinc: {
          200: 'rgb(var(--zinc-200) / <alpha-value>)',
          300: 'rgb(var(--zinc-300) / <alpha-value>)',
          400: 'rgb(var(--zinc-400) / <alpha-value>)',
          500: 'rgb(var(--zinc-500) / <alpha-value>)',
          600: 'rgb(var(--zinc-600) / <alpha-value>)',
          700: 'rgb(var(--zinc-700) / <alpha-value>)',
          800: 'rgb(var(--zinc-800) / <alpha-value>)',
          900: 'rgb(var(--zinc-900) / <alpha-value>)',
          950: 'rgb(var(--zinc-950) / <alpha-value>)',
        },
      },
      minHeight: {
        touch: '3rem', // 48px — cible tactile minimale
      },
    },
  },
  plugins: [],
}
