import { getShopData } from "./api/shopService";

export const printLabel = async (labelData: any) => {
  try {
    const shop = await getShopData();
    if (!shop) {
      console.error("❌ Missing shop data for label printing.");
      return;
    }

    if (!window.electron || !window.electron.ipcRenderer) {
      console.error("Electron IPC renderer is not available.");
      return;
    }

    if (Array.isArray(labelData)) {
      window.electron.ipcRenderer.send("print-label", {
        items: labelData.map((item) => ({
          product: {
            name: item.label || item.product_name || item.name || "Product",
            barcode: item.barcode,
            mrp: item.mrp || 0,
            price: item.price || item.mop || item.mrp || 0,
            mop: item.mop || 0,
            article_no: item.article_no || "",
            dim1_value: item.dim1_value || "",
            dim2_value: item.dim2_value || "",
            batch_number: item.batch_number || "",
          },
          copies: item.copies || 1,
          customBarcode: item.barcode,
        })),
        shop,
      });
    } else if (labelData) {
      window.electron.ipcRenderer.send("print-label", {
        items: [
          {
            product: {
              name: labelData.label || labelData.product_name || labelData.name || "Product",
              barcode: labelData.barcode,
              mrp: labelData.mrp || 0,
              price: labelData.price || labelData.mop || labelData.mrp || 0,
              mop: labelData.mop || 0,
              article_no: labelData.article_no || "",
              dim1_value: labelData.dim1_value || "",
              dim2_value: labelData.dim2_value || "",
              batch_number: labelData.batch_number || "",
            },
            copies: labelData.copies || 1,
            customBarcode: labelData.barcode,
          },
        ],
        shop,
      });
    }
  } catch (err) {
    console.error("Error in printLabel:", err);
  }
};
