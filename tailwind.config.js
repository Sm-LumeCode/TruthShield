/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-color)',
        surface: 'var(--surface-color)',
        shieldRed: '#E8453C',
        shieldGreen: '#2ECC71',
        shieldBlue: '#4A90D9',
        shieldOrange: '#F5A623',
        shieldPurple: '#9B59B6',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        borderColor: 'var(--border-color)',
      }
    },
  },
  plugins: [],
}
