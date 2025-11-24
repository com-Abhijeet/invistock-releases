import * as shopRepository from "../repositories/shopRepository.mjs";

export const createShopService = async (data) => {
  //step 1 : get data from body
  const { shop } = data;
  //step 2 : Check if shop already exists If yes deny creation
  const shopAlreadyExists = await shopRepository.getShop();
  if (shopAlreadyExists) {
    throw new Error("Shop already exists");
  }
  //step 3 : Create shop and save it to database
  return await shopRepository.createShop(shop);
};

export const getShopService = async () => {
  return await shopRepository.getShop();
};
/**
 * @description Validates and updates the shop settings.
 * @param {object} shopData - The settings data from the controller.
 * @returns {Promise<object>} The fully updated shop data object.
 */
export async function updateShopData(shopData) {
  try {
    // Create a copy to avoid modifying the original request object
    const normalizedData = { ...shopData };

    // Convert boolean values from the frontend (true/false) to integers (1/0) for SQLite
    for (const key in normalizedData) {
      if (typeof normalizedData[key] === "boolean") {
        normalizedData[key] = normalizedData[key] ? 1 : 0;
      }
    }

    await shopRepository.updateShop(normalizedData);

    // Return the fresh, updated data from the database
    return shopRepository.getShop();
  } catch (error) {
    console.error("Error in updateShopData service:", error.message);
    throw new Error("Failed to update shop settings.");
  }
}
