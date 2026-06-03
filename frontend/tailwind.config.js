/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        ambient: "0 24px 70px rgba(15, 23, 42, 0.18)"
      },
      colors: {
        brand: {
          50: "#eef4ff",
          500: "#2763ff",
          600: "#1f54dd",
          700: "#1a46b4"
        }
      },
      backgroundImage: {
        mesh:
          "radial-gradient(circle at top left, rgba(39,99,255,0.2), transparent 28%), radial-gradient(circle at bottom right, rgba(251,146,60,0.16), transparent 24%)"
      }
    }
  },
  plugins: []
};

