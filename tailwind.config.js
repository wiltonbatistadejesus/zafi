/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tell Tailwind which files to scan for class names
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Zafi brand colors
      colors: {
        zafi: {
          blue: '#1565ff',
          'blue-dark': '#0d47d9',
          bg: '#e9f0ff',
          text: '#0f172a',
          secondary: '#64748b',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
