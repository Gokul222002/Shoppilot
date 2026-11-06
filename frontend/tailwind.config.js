/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        alpine: {
          950: '#0e1411',
          900: '#141d18',
          850: '#1a2520',
          800: '#212f29',
          750: '#263730',
          700: '#2e423a',
          600: '#435e53',
          500: '#5e8072',
          400: '#8ba69b',
          300: '#b8ccc4',
          100: '#e5eee9',
        },
        copper: {
          400: '#eb8d74',
          500: '#e07a5f',
          600: '#d16345',
          700: '#b84e32',
        },
        sand: {
          50: '#fdfbf7',
          100: '#f4f1de',
          200: '#ece7d4',
          300: '#ded7c1',
          400: '#aba289',
          500: '#877e68',
        }
      },
      fontFamily: {
        display: ['Oswald', 'Plus Jakarta Sans', 'sans-serif'],
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
