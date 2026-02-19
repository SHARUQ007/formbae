import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f5f8f4",
        panel: "#ffffff",
        ink: "#1b2a1f",
        accent: "#2f855a",
        warn: "#c05621"
      }
    }
  },
  plugins: []
};

export default config;
