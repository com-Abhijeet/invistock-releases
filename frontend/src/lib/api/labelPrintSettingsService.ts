import { api } from "./api";
import type { LabelPrintSettings } from "../types/labelPrintSettingsTypes";

export async function getLabelPrintSettings(): Promise<LabelPrintSettings> {
  const res = await api.get("/api/label-print-settings");
  return res.data?.data || res.data;
}

export async function updateLabelPrintSettings(
  data: Partial<LabelPrintSettings>
): Promise<LabelPrintSettings> {
  const res = await api.put("/api/label-print-settings", data);
  return res.data?.data || res.data;
}
