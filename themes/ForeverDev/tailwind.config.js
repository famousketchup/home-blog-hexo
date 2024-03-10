/** @type {import('tailwindcss').Config} */
const { tailwindTransform } = require('postcss-lit')

module.exports = {
  content: ['./layout/**/*.{pug}'],
  theme: {
    extend: {}
  },
  plugins: [],
  files: ['./src/**/*.js'],
  transform: {
    js: tailwindTransform
  }
}
