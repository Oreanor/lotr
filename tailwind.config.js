/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      colors: {
        // Parchment tone behind character/enemy portraits (kept light in both
        // themes). Channels live in CSS vars so themes can swap them; the
        // <alpha-value> placeholder keeps Tailwind's /opacity modifiers working.
        parchment: "rgb(var(--parchment) / <alpha-value>)",
        // The neutral chrome scale is theme-driven: dark theme uses Tailwind's
        // defaults, light theme inverts to a parchment ramp. See src/index.css.
        neutral: {
          50: "rgb(var(--n-50) / <alpha-value>)",
          100: "rgb(var(--n-100) / <alpha-value>)",
          200: "rgb(var(--n-200) / <alpha-value>)",
          300: "rgb(var(--n-300) / <alpha-value>)",
          400: "rgb(var(--n-400) / <alpha-value>)",
          500: "rgb(var(--n-500) / <alpha-value>)",
          600: "rgb(var(--n-600) / <alpha-value>)",
          700: "rgb(var(--n-700) / <alpha-value>)",
          800: "rgb(var(--n-800) / <alpha-value>)",
          900: "rgb(var(--n-900) / <alpha-value>)",
          950: "rgb(var(--n-950) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
