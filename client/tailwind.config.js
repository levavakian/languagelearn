/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'black': '#000000',
        'indigo-dye': '#274268',
        'coral-light': '#ff8969aa',
        'coral': '#ff8969',
        'pink': '#f8ece4',
        'pink-faded': '#cc2c0077',
        'alice-blue': '#dfe9f6',
        'alice-dark': '#d3dff5',
        'baby-powder': '#f7f7f2',
        'baby-powder-10': '#f7f7f21a',
        'baby-powder-dark': '#e7e7e2ff',
        'lavender': '#d3dff5',
        'half-grey': '#a2a2a2',
        'quarter-grey': '#a2a2a2aa',
        'warn-red': '#ac3636',
        'porcelain': '#f0f1f2',
        'transparent-grey': '#a2a2a233',
        'okgreen': '#679436',
      }
    },
    fontFamily: {
      'sans': ['Nobel Uno', 'sans-serif'],
      'ancorli': ['Ancorli', 'sans-serif'],
      'nobel': ['Nobel Uno', 'sans-serif'],
    }
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  }
}