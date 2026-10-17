/** @type {import('tailwindcss').Config} */

// Teinte pilotée par une CSS variable (changement de thème sans rebuild).
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`

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
        white: themed('color-white'),
        zinc: {
          200: themed('zinc-200'),
          300: themed('zinc-300'),
          400: themed('zinc-400'),
          500: themed('zinc-500'),
          600: themed('zinc-600'),
          700: themed('zinc-700'),
          800: themed('zinc-800'),
          900: themed('zinc-900'),
          950: themed('zinc-950'),
        },
        // Teintes de texte assombries en thème clair pour rester lisibles.
        green: { 300: themed('green-300'), 400: themed('green-400') },
        red: { 300: themed('red-300'), 400: themed('red-400') },
        yellow: { 300: themed('yellow-300'), 400: themed('yellow-400') },
        blue: { 300: themed('blue-300'), 400: themed('blue-400') },
        orange: { 300: themed('orange-300'), 400: themed('orange-400') },
        // Couleurs fixes, identiques dans tous les thèmes.
        paper: '#ffffff', // texte sur fond noir ou coloré
        win: '#2e8b3e', // score gagnant
        loss: '#e53935', // score perdant
        draw: '#f07c00', // égalité
        qualified: '#4cc95a', // rang qualifié
        highlight: '#ffec5c', // mon équipe
      },
      fontFamily: {
        sans: ['"Figtree Variable"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        // Graisse affinée en thème clair (voir index.css).
        bold: 'var(--fw-bold)',
        black: 'var(--fw-black)',
      },
      minHeight: {
        touch: '3rem', // 48px — cible tactile minimale
      },
    },
  },
  plugins: [],
}
