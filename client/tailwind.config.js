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
        },
        cafe: {
          bg: '#F3E6D6', bgDeep: '#EAD7BE', card: '#FFF9F0', border: '#DCC3A0',
          espresso: '#3C2A20', espressoLight: '#5A4335',
          terracotta: '#C1440E', terracottaLight: '#E37A45', terracottaDark: '#9A360A',
          olive: '#6E7B3A', cream: '#FFFDF8', danger: '#B5433A',
        }
      },
      fontFamily: {
        fraunces: ['Fraunces','serif'],
        inter: ['Inter','sans-serif'],
        display: ['"Playfair Display"', 'serif'],
        body: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201,161,95,0.15)',
        'gold-lg': '0 0 30px rgba(201,161,95,0.2)',
        cafe: '0 8px 24px rgba(60,42,32,0.12)',
        'cafe-lg': '0 12px 36px rgba(60,42,32,0.18)',
      }
    },
  },
  plugins: [],
}
