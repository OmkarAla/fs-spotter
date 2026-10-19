/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        logistics: {
          base: '#0F172A',
          warning: '#F59E0B',
          critical: '#EF4444',
          safe: '#10B981',
          text: '#F8FAFC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

