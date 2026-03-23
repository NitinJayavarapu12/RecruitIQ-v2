/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F6F3",
        parchment: "#EDEBE6",
        border: "#DDD9D2",
        muted: "#8A8278",
        ink: "#1A1A1A",
        blue: {
          DEFAULT: "#2563EB",
          light: "#EFF6FF",
          mid: "#BFDBFE",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
        soft: "0 2px 12px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};