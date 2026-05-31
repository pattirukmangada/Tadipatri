/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1a3a2a',
          light: '#2d5a3d',
          dark: '#0f2218',
        },
        lemon: {
          DEFAULT: '#f5c518',
          light: '#f9d84a',
          dark: '#d4a80a',
        },
        cream: '#fffdf0',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
        telugu: ['"Noto Sans Telugu"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
