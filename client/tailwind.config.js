/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        diana: {
          dark: '#D4A373', darker: '#C2925F', card: '#DFB489',
          border: '#B98C5E', gold: '#8B5E34', goldLight: '#A8754A',
          goldDark: '#6E492A', cream: '#3A2A18', creamDark: '#2C1F12',
          brown: '#5C4326', brownLight: '#4A3520', brownDark: '#2C1F12',
          accent: '#8B3A2A', accentLight: '#E08A6F', danger: '#E5484D',
        }
      },
      fontFamily: {
        fraunces: ['Fraunces','serif'],
        inter: ['Inter','sans-serif'],
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201,161,95,0.15)',
        'gold-lg': '0 0 30px rgba(201,161,95,0.2)',
      }
    },
  },
  plugins: [],
}
