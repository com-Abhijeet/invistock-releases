export interface LabelPrintSettings {
  id?: number;
  label_printer_name: string;
  label_printer_width_mm: number;
  label_printer_height_mm: number;
  label_cols_per_row: number;
  label_gap_between_cols: number;
  label_horizontal_offset: number;
  label_vertical_offset: number;
  label_template_id: string;
  silent_printing: boolean | number;
}
