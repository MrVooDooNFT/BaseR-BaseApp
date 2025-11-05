/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // Bazı özel renk sınıflarının build'de korunması için
  safelist: [
    "text-muted-foreground",
    "bg-muted",
    "bg-muted-foreground",
    "text-foreground",
    "bg-background",
  ],

  theme: {
    extend: {
      colors: {
        /* --------------------------------------------------
           Ana renk sistemi (CSS değişkenleriyle uyumlu)
        -------------------------------------------------- */
        background: "oklch(var(--background))",
        foreground: "hsl(var(--foreground))",

        card: "oklch(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",

        popover: "oklch(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))", // text-muted-foreground
        },

        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* --------------------------------------------------
           Sidebar ve chart renkleri (oklch tabanlı)
        -------------------------------------------------- */
        sidebar: "oklch(var(--sidebar))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        "sidebar-primary": "hsl(var(--sidebar-primary))",
        "sidebar-primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        "sidebar-accent": "hsl(var(--sidebar-accent))",
        "sidebar-accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        "sidebar-border": "hsl(var(--sidebar-border))",
        "sidebar-ring": "hsl(var(--sidebar-ring))",

        "chart-1": "oklch(var(--chart-1))",
        "chart-2": "oklch(var(--chart-2))",
        "chart-3": "oklch(var(--chart-3))",
        "chart-4": "oklch(var(--chart-4))",
        "chart-5": "oklch(var(--chart-5))",
      },

      borderRadius: {
        lg: "var(--radius)",
      },
    },
  },

  plugins: [],
};
