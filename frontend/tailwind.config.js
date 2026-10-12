/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#F7F7F8",
          tertiary: "#F0F0F2",
        },
        silver: {
          light: "#F5F5F7",
          DEFAULT: "#E5E5E7",
          dark: "#D9D9DD",
          border: "#E2E2E5",
        },
        platinum: {
          DEFAULT: "#D9D9DD",
          glow: "#EAEAEA",
        },
        graphite: {
          light: "#3A3A3C",
          DEFAULT: "#1D1D1F",
          dark: "#111111",
        },
        muted: {
          DEFAULT: "#6B6B70",
          light: "#86868B",
        },
        financial: {
          positive: "#10B981",
          positiveBg: "#ECFDF5",
          positiveBorder: "#A7F3D0",
          warning: "#F59E0B",
          warningBg: "#FFFBEB",
          warningBorder: "#FDE68A",
          negative: "#EF4444",
          negativeBg: "#FEF2F2",
          negativeBorder: "#FECACA",
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'silver-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'silver-md': '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'silver-lg': '0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'silver-glow': '0 0 20px rgba(229, 229, 231, 0.6)',
      },
    },
  },
  plugins: [],
}

