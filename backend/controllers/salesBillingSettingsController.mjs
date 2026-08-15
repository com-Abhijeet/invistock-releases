import * as SettingsRepo from "../repositories/salesBillingSettingsRepository.mjs";

export function getSalesBillingSettings(req, res) {
  try {
    const settings = SettingsRepo.getSalesBillingSettings();
    res.json({ status: "success", data: settings });
  } catch (error) {
    console.error("getSalesBillingSettings -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}

export function updateSalesBillingSettings(req, res) {
  try {
    const data = req.body;
    const settings = SettingsRepo.updateSalesBillingSettings(data);
    res.json({ status: "success", data: settings });
  } catch (error) {
    console.error("updateSalesBillingSettings -", error);
    res.status(500).json({ status: "error", error: error.message });
  }
}
