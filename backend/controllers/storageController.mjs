import * as service from "../services/storageService.mjs";

export const addStorageLocation = async (req, res) => {
  try {
    await service.addStorageService(req.db, req.body);
    res
      .status(201)
      .json({ status: "success", message: "Storage location added" });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};
