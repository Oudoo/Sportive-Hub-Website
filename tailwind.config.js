/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0166FF", // Electric Blue
        secondary: "#72AAFF", // Soft Blue
        accent: "#DAEAFF", // Pale Blue
        background: "#EFF6FF", // Ice Blue
        text: "#555555", // Dark Grey
        heading: "#000000", // Black
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      height: {
        'screen-minus-nav': 'calc(100vh - 64px)',
      }
    },
  },
  plugins: [],
}
