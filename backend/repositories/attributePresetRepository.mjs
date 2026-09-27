import db from "../db/db.mjs";

/**
 * Fetch all attribute presets with their values
 */
export function getAllAttributePresets() {
  const presets = db
    .prepare("SELECT * FROM attribute_presets ORDER BY name ASC")
    .all();

  const getValueStmt = db.prepare(
    "SELECT * FROM attribute_preset_values WHERE preset_id = ? ORDER BY display_order ASC",
  );

  return presets.map((preset) => ({
    ...preset,
    values: getValueStmt.all(preset.id),
  }));
}

/**
 * Fetch single attribute preset by ID
 */
export function getAttributePresetById(id) {
  const preset = db
    .prepare("SELECT * FROM attribute_presets WHERE id = ?")
    .get(id);
  if (!preset) return null;

  const values = db
    .prepare(
      "SELECT * FROM attribute_preset_values WHERE preset_id = ? ORDER BY display_order ASC",
    )
    .all(id);

  return {
    ...preset,
    values,
  };
}

/**
 * Create a new attribute preset with values
 */
export function createAttributePreset({ name, dimension_label, values = [] }) {
  const insertPreset = db.prepare(
    "INSERT INTO attribute_presets (name, dimension_label) VALUES (?, ?)",
  );
  const insertValue = db.prepare(
    "INSERT INTO attribute_preset_values (preset_id, value, display_order) VALUES (?, ?, ?)",
  );

  const transaction = db.transaction(() => {
    const res = insertPreset.run(name, dimension_label);
    const presetId = res.lastInsertRowid;

    values.forEach((val, idx) => {
      const valStr = typeof val === "string" ? val : val.value;
      if (valStr && valStr.trim()) {
        insertValue.run(presetId, valStr.trim(), idx + 1);
      }
    });

    return presetId;
  });

  const id = transaction();
  return getAttributePresetById(id);
}

/**
 * Update an existing attribute preset
 */
export function updateAttributePreset(id, { name, dimension_label, values = [] }) {
  const updatePreset = db.prepare(
    "UPDATE attribute_presets SET name = ?, dimension_label = ? WHERE id = ?",
  );
  const deleteValues = db.prepare(
    "DELETE FROM attribute_preset_values WHERE preset_id = ?",
  );
  const insertValue = db.prepare(
    "INSERT INTO attribute_preset_values (preset_id, value, display_order) VALUES (?, ?, ?)",
  );

  const transaction = db.transaction(() => {
    updatePreset.run(name, dimension_label, id);
    deleteValues.run(id);

    values.forEach((val, idx) => {
      const valStr = typeof val === "string" ? val : val.value;
      if (valStr && valStr.trim()) {
        insertValue.run(id, valStr.trim(), idx + 1);
      }
    });
  });

  transaction();
  return getAttributePresetById(id);
}

/**
 * Delete an attribute preset
 */
export function deleteAttributePreset(id) {
  const stmt = db.prepare("DELETE FROM attribute_presets WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}
