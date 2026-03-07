import * as businessService from "../services/businessService.mjs";

export function getBusiness(req, res) {
  try {
    const data = businessService.getBusiness();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export function updateBusiness(req, res) {
  try {
    const data = businessService.updateBusiness(req.body);
    res.json({
      success: true,
      message: "Business details updated successfully",
      data,
    });
  } catch (error) {
    // If a key is passed that doesn't exist in the DB schema, SQLite will throw an error here automatically
    res.status(500).json({ success: false, error: error.message });
  }
}
