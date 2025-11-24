import { api } from "./api";
import type { ShopSetupForm as Shop, ShopSetupForm } from "../types/shopTypes"; // adjust import path as per your project

const SHOP_CACHE_KEY = "shop";

export async function getShopData(): Promise<Shop | null> {
  // Try cache first
  const cachedShop = localStorage.getItem(SHOP_CACHE_KEY);
  if (cachedShop) {
    try {
      const shopData: Shop = JSON.parse(cachedShop);
      if (shopData?.shop_name) {
        return shopData;
      }
    } catch {
      localStorage.removeItem(SHOP_CACHE_KEY);
    }
  }

  // Fetch from backend
  try {
    const res = await api.get<{ data: Shop | null }>("/api/shop");
    if (res.data?.data) {
      localStorage.setItem(SHOP_CACHE_KEY, JSON.stringify(res.data.data));
      return res.data.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch shop data:", error);
    return null;
  }
}

/**
 * @description Updates the shop settings by sending data to the backend API.
 * @param {ShopSetupForm} shopData - The complete shop settings form data.
 * @returns {Promise<ShopSetupForm>} The updated shop data returned from the server.
 * @throws {Error} If the API call fails.
 */
export async function updateShopData(
  shopData: ShopSetupForm
): Promise<ShopSetupForm> {
  try {
    // Use api.put to send a PUT request to the base endpoint
    const res = await api.put("/api/shop", shopData);

    // The backend wraps the updated data in a 'data' property
    return res.data.data;
  } catch (err: any) {
    // Log the detailed error for debugging
    console.error(
      "Failed to update shop settings:",
      err.response?.data?.message || err.message
    );

    // Throw a more user-friendly error to be caught by the calling component
    throw new Error("Could not save settings. Please try again.");
  }
}
