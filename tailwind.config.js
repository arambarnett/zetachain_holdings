/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'roobert': ['Roobert', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'sans': ['Roobert', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ZetaChain Brand Colors
        zeta: {
          50: '#f0fdf9',
          100: '#ccfdf0',
          200: '#99f6e2',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#008462', // Primary brand color
          600: '#006e4c', // Dark variant
          700: '#005a3d',
          800: '#004632',
          900: '#003529',
        },
        // ZetaChain accent colors
        accent: {
          light: '#99F36F',
          dark: '#006E4C',
        },
        // Modern neutral palette
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Legacy support
        primary: {
          50: '#f0fdf9',
          100: '#ccfdf0',
          500: '#008462',
          600: '#006e4c',
          700: '#005a3d',
        },
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          600: '#525252',
          700: '#404040',
          900: '#171717',
        }
      },
    },
  },
  plugins: [],
}