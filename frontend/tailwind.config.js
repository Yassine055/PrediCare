/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0C447C',
          light: '#E6F1FB',
          medium: '#185FA5',
        },
        risk: {
          low: '#27500A',
          lowBg: '#EAF3DE',
          mid: '#633806',
          midBg: '#FAEEDA',
          high: '#791F1F',
          highBg: '#FCEBEB',
        },
        bg: '#F0F4F8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
