// Builds a full 50–950 colour scale whose channels come from CSS variables
// (e.g. --amber-700), so themes can swap them. The <alpha-value> placeholder
// keeps Tailwind's /opacity modifiers working.
const ramp = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [
      shade,
      `rgb(var(--${name}-${shade}) / <alpha-value>)`,
    ]),
  );

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
        neutral: ramp("n"),
        // Accent ramps are themed too: light theme reverses each (see index.css)
        // so accent text darkens and accent button fills lighten, staying legible
        // on parchment. Saturated mid shades (~500) are unchanged by the reversal,
        // keeping health bars and the like identical in both themes.
        amber: ramp("amber"),
        emerald: ramp("emerald"),
        sky: ramp("sky"),
        red: ramp("red"),
        yellow: ramp("yellow"),
      },
    },
  },
  plugins: [],
};
