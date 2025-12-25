import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "../theme"; // Reuse your existing theme!
import MobileApp from "./MobileApp"; // We will create this next
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="bottom-center" />
      <MobileApp />
    </ThemeProvider>
  </React.StrictMode>
);
