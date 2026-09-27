import { api } from "./api";

export interface AttributePresetValue {
  id?: number;
  preset_id?: number;
  dimension_index?: number;
  value_name?: string;
  value: string;
  display_order?: number;
}

export interface AttributePreset {
  id: number;
  name: string;
  industry?: string;
  dimension_label: string;
  dim1_name?: string;
  dim2_name?: string;
  created_at?: string;
  values: AttributePresetValue[];
}

export async function getAllAttributePresets(): Promise<AttributePreset[]> {
  const res = await api.get("/api/attribute-presets");
  return res.data.data || [];
}

export const getAttributePresets = getAllAttributePresets;

export async function getAttributePresetById(id: number): Promise<AttributePreset | null> {
  const res = await api.get(`/api/attribute-presets/${id}`);
  return res.data.data || null;
}

export async function createAttributePreset(data: {
  name: string;
  dimension_label: string;
  values: string[];
}): Promise<AttributePreset> {
  const res = await api.post("/api/attribute-presets", data);
  return res.data.data;
}

export async function updateAttributePreset(
  id: number,
  data: {
    name: string;
    dimension_label: string;
    values: string[];
  },
): Promise<AttributePreset> {
  const res = await api.put(`/api/attribute-presets/${id}`, data);
  return res.data.data;
}

export async function deleteAttributePreset(id: number): Promise<boolean> {
  const res = await api.delete(`/api/attribute-presets/${id}`);
  return res.data.status === "success";
}
