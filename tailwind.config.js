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
      },
      minHeight: {
        touch: '3rem', // 48px — cible tactile minimale
      },
    },
  },
  plugins: [],
}
