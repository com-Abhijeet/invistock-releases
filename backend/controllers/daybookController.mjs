import * as ReportService from "../services/daybookService.mjs";

export function getDayBookController(req, res) {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) {
      return res
        .status(400)
        .json({ success: false, error: "Date is required" });
    }

    const data = ReportService.getDayBookService(date);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("DayBook Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
