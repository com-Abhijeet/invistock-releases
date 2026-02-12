/**
 * Universal Unit Conversion Service
 * Handles conversion between standard physical units and product-specific packaging.
 */

const UNIT_FAMILIES = {
  WEIGHT: {
    base: "kg",
    units: {
      kg: 1,
      g: 0.001,
      mg: 0.000001,
      quintal: 100,
      tonne: 1000,
      lb: 0.453592, // Pound
      oz: 0.0283495, // Ounce
    },
  },
  VOLUME: {
    base: "l",
    units: {
      l: 1,
      ml: 0.001,
      gl: 3.78541, // Gallon (US)
    },
  },
  LENGTH: {
    base: "m",
    units: {
      m: 1,
      cm: 0.01,
      mm: 0.001,
      ft: 0.3048,
      in: 0.0254,
    },
  },
  COUNT: {
    base: "pcs",
    units: {
      pcs: 1,
      doz: 12,
      gross: 144,
    },
  },
};

// Flattened map for quick lookup (e.g., 'g' -> 0.001)
const STANDARD_FACTORS = {};
Object.values(UNIT_FAMILIES).forEach((family) => {
  Object.assign(STANDARD_FACTORS, family.units);
});

/**
 * Determines if a unit is a standard physical unit (e.g., 'kg', 'm', 'pcs').
 */
export function isStandardUnit(unit) {
  return unit && STANDARD_FACTORS.hasOwnProperty(unit.toLowerCase());
}

/**
 * Converts a quantity from a transaction unit to the product's storage (base) unit.
 *
 * @param {number} qty - The quantity entered by the user.
 * @param {string} fromUnit - The unit selected by the user (e.g., 'Box', 'g').
 * @param {object} product - The product object containing base_unit, secondary_unit, conversion_factor.
 * @returns {number} The quantity in the product's base_unit.
 */
export function convertToStockQuantity(qty, fromUnit, product) {
  if (!fromUnit || !product || !product.base_unit) return qty;

  const normalizedFrom = fromUnit.toLowerCase();
  const normalizedBase = product.base_unit.toLowerCase();

  // 1. Direct Match
  if (normalizedFrom === normalizedBase) {
    return qty;
  }

  // 2. Secondary Unit (Packaging) Match (e.g., "Box" -> "pcs")
  if (
    product.secondary_unit &&
    normalizedFrom === product.secondary_unit.toLowerCase()
  ) {
    return qty * (product.conversion_factor || 1);
  }

  // 3. Standard Physics Conversion (e.g., "g" -> "kg")
  const fromFactor = STANDARD_FACTORS[normalizedFrom];
  const baseFactor = STANDARD_FACTORS[normalizedBase];

  if (fromFactor !== undefined && baseFactor !== undefined) {
    // Formula: Qty * (FromFactor / BaseFactor)
    // Ex: 500g to kg -> 500 * (0.001 / 1) = 0.5 kg
    // Ex: 1kg to g -> 1 * (1 / 0.001) = 1000 g
    return qty * (fromFactor / baseFactor);
  }

  // Fallback: If we can't convert, assume 1:1 but log warning
  console.warn(
    `[UnitService] Cannot convert ${fromUnit} to ${product.base_unit} for product ${product.name}`,
  );
  return qty;
}

/**
 * Calculates the price for a specific unit based on the product's MRP/Rate.
 * Assumes the product.mrp is stored per product.base_unit.
 *
 * @param {number} baseRate - The rate per base unit (e.g., Rate per kg).
 * @param {string} targetUnit - The unit we want the price for (e.g., 'g', 'Box').
 * @param {object} product - The product object.
 * @returns {number} The calculated rate for the target unit.
 */
export function calculateRateForUnit(baseRate, targetUnit, product) {
  if (!targetUnit || !product || !product.base_unit) return baseRate;

  const normalizedTarget = targetUnit.toLowerCase();
  const normalizedBase = product.base_unit.toLowerCase();

  if (normalizedTarget === normalizedBase) return baseRate;

  // 1. Secondary Unit (Packaging) Price (e.g., Price of 1 Box)
  if (
    product.secondary_unit &&
    normalizedTarget === product.secondary_unit.toLowerCase()
  ) {
    return baseRate * (product.conversion_factor || 1);
  }

  // 2. Standard Physics Price (e.g., Price per gram)
  const targetFactor = STANDARD_FACTORS[normalizedTarget];
  const baseFactor = STANDARD_FACTORS[normalizedBase];

  if (targetFactor !== undefined && baseFactor !== undefined) {
    // Formula: BaseRate * (TargetFactor / BaseFactor)
    // Ex: Rate $100/kg. What is rate for 1g? -> 100 * (0.001/1) = $0.1
    return baseRate * (targetFactor / baseFactor);
  }

  return baseRate;
}

/**
 * Get list of compatible units for a product to show in Dropdown
 */
export function getAvailableUnits(product) {
  const units = [product.base_unit];
  if (product.secondary_unit) units.push(product.secondary_unit);

  // Add all standard units of the same family
  const baseFamily = Object.values(UNIT_FAMILIES).find((f) =>
    f.units.hasOwnProperty(product.base_unit.toLowerCase()),
  );

  if (baseFamily) {
    Object.keys(baseFamily.units).forEach((u) => {
      if (!units.includes(u)) units.push(u);
    });
  }

  return units;
}
