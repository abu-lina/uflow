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
        primary: '#589D96', // Teal/green from Figma
        'primary-dark': '#4a8a84', // Slightly darker shade for hover
        'primary-light': '#BFDBD8', // Light teal from Figma
        'dark': '#232323', // Dark color from Figma
        'light-gray': '#EEEEEE', // Light gray from Figma
      },
      backgroundImage: {
        'gradient-light': 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)',
      }
    },
  },
  plugins: [],
  // ... rest of your config
}; 