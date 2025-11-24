// src/theme/theme.ts
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",       // Calm Blue
      light: "#63a4ff",
      dark: "#004ba0",
      contrastText: "#fff",
    },
    secondary: {
      main: "#7e57c2",        // Soft Purple
      light: "#b085f5",
      dark: "#4d2c91",
      contrastText: "#fff",
    },
    success: {
      main: "#388e3c",
      light: "#66bb6a",
      dark: "#2e7d32",
      contrastText: "#fff",
    },
    error: {
      main: "#d32f2f",
      light: "#ef5350",
      dark: "#c62828",
      contrastText: "#fff",
    },
    background: {
      default: "#fdfdfd",
      paper: "#f8f8f8",
    },
    text: {
      primary: "#222",
      secondary: "#555",
    },
  },
});

export default theme;
