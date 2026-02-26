/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#10b77f",
        "primary-dark": "#059669",
        "background-light": "#f6f8f7",
        "background-dark": "#0B0F19",
        "surface-dark": "#151b2b",
        "surface-glass": "rgba(21, 27, 43, 0.7)",
        charcoal: "#111827",
        "panel-dark": "#111827",
        "border-dark": "#1f2937",
        "input-bg": "#1F2937",
        "slate-card": "#151B28",
        "accent-amber": "#F59E0B",
        "accent-red": "#EF4444",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        'primary-glow': '0 0 20px rgba(16, 183, 127, 0.15)',
        'primary-glow-lg': '0 4px 20px rgba(16, 183, 127, 0.4)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
