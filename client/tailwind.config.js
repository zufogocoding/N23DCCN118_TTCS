/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        danger: 'var(--danger)',
      },
    },
  },
  plugins: [],
}