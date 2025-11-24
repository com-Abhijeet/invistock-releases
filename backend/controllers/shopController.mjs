import * as service from "../services/shopService.mjs";

export const createShop = async (req, res) => {
  try {
    const result = await service.createShopService(req.body);
    return res
      .status(201)
      .json({ status: "success", message: "Shop created", data: result });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

export const getShop = async (req, res) => {
  const result = await service.getShopService();
  res.json({ status: "success", data: result });
};

export const setupShop = async (req, res) => {
  try {
    const result = await service.setupShopService(req.body);
    res.status(201).json({
      status: "success",
      message: "Shop setup complete",
      data: result,
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

/**
 * @description Controller to handle updating shop settings.
 * @route PUT /api/shop
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
export const updateShop = async (req, res) => {
  try {
    const shopData = req.body;
    if (!shopData || Object.keys(shopData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided for update.",
      });
    }

    const updatedShop = await service.updateShopData(shopData);

    res.status(200).json({
      success: true,
      message: "Shop settings updated successfully.",
      data: updatedShop,
    });
  } catch (error) {
    console.error("Error in updateShop controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update shop settings.",
      error: "An internal server error occurred.",
    });
  }
};
