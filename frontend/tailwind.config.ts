import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F2",
        ink: "#2B2B2E",
        sage: {
          DEFAULT: "#5B6E5B",
          muted: "#8B9A8B",
          soft: "#EEF1EC",
        },
        clay: {
          DEFAULT: "#C97B5E",
          soft: "#F7E9E2",
        },
        line: "#E8E2D6",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;