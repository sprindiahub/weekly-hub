/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // SPR India Primary — #4d0e38 (deep maroon)
        spr: {
          50:  "#fdf2f7",
          100: "#fae6f1",
          200: "#f5ccdf",
          300: "#eda3c5",
          400: "#e070a0",
          500: "#cc4479",
          600: "#b02860",
          700: "#4d0e38",   // PRIMARY
          800: "#3d0b2d",
          900: "#2c0820",
          950: "#180412",
        },
        // Corporate Gold accent
        gold: {
          50:  "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#c9a84c",   // ACCENT GOLD
          700: "#a16207",
          800: "#854d0e",
        },
        // Warm neutrals
        warm: {
          50:  "#faf9f8",
          100: "#f4f2f0",
          200: "#e8e4e0",
          300: "#d4cec8",
          400: "#a89f98",
          500: "#7a7068",
          600: "#5c544e",
          700: "#3f3834",
          800: "#2a2420",
          900: "#1a1512",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans:    ["'Nunito Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono:    ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem",  { lineHeight: "1rem" }],
        "xs":  ["0.75rem",  { lineHeight: "1.125rem" }],
        "sm":  ["0.8125rem",{ lineHeight: "1.25rem" }],
        "base":["0.9375rem",{ lineHeight: "1.5rem" }],
        "lg":  ["1.0625rem",{ lineHeight: "1.625rem" }],
        "xl":  ["1.1875rem",{ lineHeight: "1.75rem" }],
        "2xl": ["1.375rem", { lineHeight: "2rem" }],
        "3xl": ["1.75rem",  { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem",  { lineHeight: "2.75rem" }],
        "5xl": ["3rem",     { lineHeight: "1.1" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
      },
      borderRadius: {
        "none": "0",
        "sm":   "0.25rem",
        DEFAULT:"0.5rem",
        "md":   "0.625rem",
        "lg":   "0.875rem",
        "xl":   "1.125rem",
        "2xl":  "1.5rem",
        "full": "9999px",
      },
      boxShadow: {
        "spr-xs": "0 1px 2px rgba(77,14,56,0.06), 0 1px 3px rgba(77,14,56,0.04)",
        "spr-sm": "0 2px 8px rgba(77,14,56,0.10), 0 1px 3px rgba(77,14,56,0.06)",
        "spr":    "0 4px 16px rgba(77,14,56,0.14), 0 2px 6px rgba(77,14,56,0.08)",
        "spr-lg": "0 8px 32px rgba(77,14,56,0.18), 0 4px 12px rgba(77,14,56,0.10)",
        "spr-xl": "0 16px 48px rgba(77,14,56,0.22), 0 8px 24px rgba(77,14,56,0.12)",
        "inner-spr": "inset 0 1px 4px rgba(77,14,56,0.10)",
        "gold":   "0 4px 16px rgba(201,168,76,0.30)",
      },
      animation: {
        "fade-in":      "fadeIn 0.3s ease-out",
        "slide-up":     "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-r":   "slideInR 0.3s cubic-bezier(0.16,1,0.3,1)",
        "scale-in":     "scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)",
        "shimmer":      "shimmer 2s linear infinite",
        "pulse-ring":   "pulseRing 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite",
        "btn-shine":    "btnShine 0.5s ease forwards",
        "count-up":     "countUp 0.6s cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        fadeIn:   { "0%": { opacity: "0" },                                   "100%": { opacity: "1" } },
        slideUp:  { "0%": { opacity: "0", transform: "translateY(12px)" },    "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInR: { "0%": { opacity: "0", transform: "translateX(16px)" },    "100%": { opacity: "1", transform: "translateX(0)" } },
        scaleIn:  { "0%": { opacity: "0", transform: "scale(0.95)" },         "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer:  { "0%": { backgroundPosition: "-600px 0" },                 "100%": { backgroundPosition: "600px 0" } },
        pulseRing:{
          "0%":   { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(77,14,56,0.5)" },
          "70%":  { transform: "scale(1)",    boxShadow: "0 0 0 8px rgba(77,14,56,0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(77,14,56,0)" },
        },
        btnShine: {
          "0%":   { left: "-100%" },
          "100%": { left: "200%" },
        },
        countUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      transitionTimingFunction: {
        "spring":  "cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce":  "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
}
