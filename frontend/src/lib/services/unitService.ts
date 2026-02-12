/**
 * Frontend Unit Conversion Service
 * Provides constants and helpers for unit selection and display.
 */

export const UNIT_FAMILIES = {
  WEIGHT: {
    label: "Weight",
    base: "kg",
    units: [
      { value: "kg", label: "Kilogram (kg)" },
      { value: "g", label: "Gram (g)" },
      { value: "mg", label: "Milligram (mg)" },
      { value: "quintal", label: "Quintal (100kg)" },
      { value: "tonne", label: "Tonne (1000kg)" },
    ],
  },
  VOLUME: {
    label: "Volume (Liquid)",
    base: "l",
    units: [
      { value: "l", label: "Liter (l)" },
      { value: "ml", label: "Milliliter (ml)" },
    ],
  },
  LENGTH: {
    label: "Length",
    base: "m",
    units: [
      { value: "m", label: "Meter (m)" },
      { value: "cm", label: "Centimeter (cm)" },
      { value: "ft", label: "Feet (ft)" },
      { value: "in", label: "Inch (in)" },
    ],
  },
  COUNT: {
    label: "Count",
    base: "pcs",
    units: [
      { value: "pcs", label: "Pieces (pcs)" },
      { value: "doz", label: "Dozen (12)" },
      { value: "gross", label: "Gross (144)" },
    ],
  },
};

// Flattened list for easy iteration if needed
export const ALL_STD_UNITS = Object.values(UNIT_FAMILIES).flatMap(
  (f) => f.units,
);

/**
 * Returns the family key (WEIGHT, VOLUME, etc.) for a given unit.
 */
export function getUnitFamily(unit: string): string | null {
  for (const [key, family] of Object.entries(UNIT_FAMILIES)) {
    if (family.units.some((u) => u.value === unit)) return key;
  }
  return null;
}

/**
 * Helper to display formatted unit strings
 * e.g., "1 Box (25 kg)"
 */
export function formatPackagingString(
  secondaryUnit: string,
  conversionFactor: number,
  baseUnit: string,
) {
  return `1 ${secondaryUnit} = ${conversionFactor} ${baseUnit}`;
}
