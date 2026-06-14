/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
      colors: {
        // Parchment tone behind character/enemy portraits.
        parchment: "#f1d18a",
      },
    },
  },
  plugins: [],
};
