import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563EB", // "Royal Blue" - Trust, Intelligence, Tech (Standard in modern SaaS)
      light: "#60A5FA", // Lighter shade for hover states
      dark: "#1E40AF", // Darker shade for active states
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#7C3AED", // "Digital Violet" - Adds a premium, creative feel without clashing
      light: "#A78BFA",
      dark: "#5B21B6",
      contrastText: "#ffffff",
    },
    success: {
      main: "#10B981", // "Emerald" - Implies growth/stability; less jarring than neon green
      light: "#34D399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    error: {
      main: "#EF4444", // "Soft Red" - clear alert signal without causing visual panic
      light: "#F87171",
      dark: "#B91C1C",
      contrastText: "#ffffff",
    },
    background: {
      default: "#F3F4F6", // "Cool Grey" - Reduces eye strain vs pure white on large screens
      paper: "#FFFFFF", // Pure White - Creates a distinct "surface" layer for cards
    },
    text: {
      primary: "#111827", // "Deep Slate" - High contrast readability, but softer than #000
      secondary: "#6B7280", // "Neutral Grey" - Excellent for labels and metadata
    },
  },
});

export default theme;
