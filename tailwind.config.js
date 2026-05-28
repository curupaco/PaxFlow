/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./todo.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
