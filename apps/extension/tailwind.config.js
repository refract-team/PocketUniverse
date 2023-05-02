/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./**/*.tsx"],
  plugins: [],
  theme: {
    // Overwriting gray with discord gray.
    extend: {
      colors: {
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#8f9092",
          400: "#787a7c",
          500: "#4b4d50",
          600: "#424549",
          700: "#36393e",
          800: "#282b30",
          900: "#1e2124"
        },
        primary: {
          50: "#f4ebfd",
          100: "#e9d6fb",
          200: "#d4adf7",
          300: "#be85f2",
          400: "#a95cee",
          500: "#9333ea",
          600: "#7629bb",
          700: "#581f8c",
          800: "#3b145e",
          900: "#1d0a2f"
        }
      },
      boxShadow: {
        "dark-border":
          "inset 0px -2px 3px #36393E, inset 0px 6px 15px rgba(0, 0, 0, 0.05), inset 0px 4px 4px rgba(0, 0, 0, 0.1)"
      }
    }
  }
};
