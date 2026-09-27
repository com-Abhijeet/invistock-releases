import db from "../db/db.mjs";

export function getLabelPrintSettings() {
  let row = db.prepare("SELECT * FROM label_print_settings WHERE id = 1").get();
  if (!row) {
    db.prepare(`
      INSERT OR IGNORE INTO label_print_settings (
        id, label_printer_name, label_printer_width_mm, label_printer_height_mm,
        label_cols_per_row, label_gap_between_cols, label_horizontal_offset,
        label_vertical_offset, label_template_id, silent_printing
      ) VALUES (1, '', 50, 25, 1, 2, 0, 0, 'gen_standard', 0)
    `).run();
    row = db.prepare("SELECT * FROM label_print_settings WHERE id = 1").get();
  }
  return row;
}

export function updateLabelPrintSettings(data) {
  const current = getLabelPrintSettings();
  const updated = {
    label_printer_name:
      data.label_printer_name !== undefined
        ? data.label_printer_name
        : current.label_printer_name || "",
    label_printer_width_mm:
      data.label_printer_width_mm !== undefined
        ? Number(data.label_printer_width_mm)
        : current.label_printer_width_mm,
    label_printer_height_mm:
      data.label_printer_height_mm !== undefined
        ? Number(data.label_printer_height_mm)
        : current.label_printer_height_mm,
    label_cols_per_row:
      data.label_cols_per_row !== undefined
        ? Math.max(1, Number(data.label_cols_per_row))
        : current.label_cols_per_row,
    label_gap_between_cols:
      data.label_gap_between_cols !== undefined
        ? Number(data.label_gap_between_cols)
        : current.label_gap_between_cols,
    label_horizontal_offset:
      data.label_horizontal_offset !== undefined
        ? Number(data.label_horizontal_offset)
        : current.label_horizontal_offset,
    label_vertical_offset:
      data.label_vertical_offset !== undefined
        ? Number(data.label_vertical_offset)
        : current.label_vertical_offset,
    label_template_id:
      data.label_template_id !== undefined
        ? data.label_template_id
        : current.label_template_id,
    silent_printing:
      data.silent_printing !== undefined
        ? (data.silent_printing ? 1 : 0)
        : current.silent_printing,
  };

  db.prepare(`
    UPDATE label_print_settings SET
      label_printer_name = ?,
      label_printer_width_mm = ?,
      label_printer_height_mm = ?,
      label_cols_per_row = ?,
      label_gap_between_cols = ?,
      label_horizontal_offset = ?,
      label_vertical_offset = ?,
      label_template_id = ?,
      silent_printing = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = 1
  `).run(
    updated.label_printer_name,
    updated.label_printer_width_mm,
    updated.label_printer_height_mm,
    updated.label_cols_per_row,
    updated.label_gap_between_cols,
    updated.label_horizontal_offset,
    updated.label_vertical_offset,
    updated.label_template_id,
    updated.silent_printing
  );

  return getLabelPrintSettings();
}
