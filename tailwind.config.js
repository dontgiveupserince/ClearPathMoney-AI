/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', '"General Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          bg: '#F7F6F2',
          card: '#FFFFFF',
          text: '#252525',
          muted: '#6F746F',
          teal: '#0F766E',
          ai: '#7C3AED',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          blue: '#2563EB',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
