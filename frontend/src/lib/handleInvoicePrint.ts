import type { SaleData } from "./types/salesTypes";
import type { ShopSetupForm as ShopData } from "./types/shopTypes"; // Assuming you have a type for shop

export const handlePrint = (sale: SaleData) => {
  try {
    const localSettingsString = localStorage.getItem("app_print_settings");
    const localSettings = localSettingsString
      ? JSON.parse(localSettingsString)
      : {};

    console.log(localSettings);
    // Get shop data from local storage
    const shopDataString = localStorage.getItem("shop");
    const shopData: ShopData | null = shopDataString
      ? JSON.parse(shopDataString)
      : null;

    // Combine into one object
    const payload = {
      sale,
      shop: shopData || {}, // fallback empty object if missing
      localSettings,
    };

    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send("print-invoice", payload);
    } else {
      console.error("Electron IPC not available");
    }
  } catch (error) {
    console.error("Error preparing print payload:", error);
  }
};
