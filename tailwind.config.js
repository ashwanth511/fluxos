import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', ...fontFamily.sans],
      },
    },
  },
  plugins: [
 require('tailwindcss-animate'),
  ],
}; 