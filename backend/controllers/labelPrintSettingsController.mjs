import * as service from "../services/labelPrintSettingsService.mjs";

export async function getLabelPrintSettingsController(req, res) {
  try {
    const data = service.fetchLabelPrintSettings();
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("getLabelPrintSettingsController error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
}

export async function updateLabelPrintSettingsController(req, res) {
  try {
    const data = service.modifyLabelPrintSettings(req.body);
    res.status(200).json({ status: "success", data });
  } catch (err) {
    console.error("updateLabelPrintSettingsController error:", err);
    res.status(400).json({ status: "error", message: err.message });
  }
}
