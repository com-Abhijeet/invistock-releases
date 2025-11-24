import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ShopProvider from "./providers/shopProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ShopProvider>
      <App />
    </ShopProvider>
  </StrictMode>
);
