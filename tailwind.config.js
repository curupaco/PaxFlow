/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mineral: {
          0: '#090d16',   // Fundo base escuro mineral profundo
          1: '#0f1523',   // Nível 1 - Cards e painéis
          2: '#161e31',   // Nível 2 - Modais, dropdowns e popovers
          3: '#1e293f',   // Nível 3 - Estados hover e superfícies ativas
        }
      },
      boxShadow: {
        'mineral-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'mineral-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'mineral-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
        display: ['Unbounded', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
