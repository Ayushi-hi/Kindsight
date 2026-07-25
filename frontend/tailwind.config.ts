import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F8F9FC",
        ink: "#1F2330",
        sage: {
          DEFAULT: "#4F46E5",
          muted: "#818CF8",
          soft: "#EEF2FF",
        },
        clay: {
          DEFAULT: "#DC2626",
          soft: "#FEE2E2",
        },
        line: "#E5E7EB",
        sidebar: "#1E1B4B",
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