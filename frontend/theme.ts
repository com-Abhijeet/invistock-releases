import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1A2744", // Deep Navy (Excellent contrast with white)
      light: "#2C3E61",
      dark: "#0F1626",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#F0A500", // Amber Gold
      light: "#F4B833",
      dark: "#A87300",
      contrastText: "#1A2744", // Navy for contrast against gold (High contrast)
    },
    success: {
      main: "#047857", // Dark Emerald - Ensures WCAG AA compliance (4.8:1) with white text
      light: "#10B981",
      dark: "#064E3B",
      contrastText: "#ffffff",
    },
    error: {
      main: "#D32F2F", // Deeper Red - Ensures WCAG AA compliance (4.6:1) with white text
      light: "#EF4444",
      dark: "#B91C1C",
      contrastText: "#ffffff",
    },
    background: {
      default: "#F4F1EA", // Dull yellowish chalk / slate yellow (extremely easy on the eyes)
      paper: "#F4F1EA", // Same as background for a flat, seamless component look
    },
    text: {
      primary: "#111827", // "Deep Slate"
      secondary: "#4B5563", // Darkened "Neutral Grey" for better contrast on cream
    },
  },
});

export default theme;

