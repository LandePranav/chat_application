/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme') ;

export default {
  content: [
    "./src/*.jsx",
    "./src/components/*.jsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        satisfy : ['"Satisfy"', ...defaultTheme.fontFamily.sans]
      }
    },
  },
  plugins: [],
}

