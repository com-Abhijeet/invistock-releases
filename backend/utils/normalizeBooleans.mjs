export const normalizeBooleans = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === "boolean") return [key, value ? 1 : 0];
      if (value === "") return [key, null]; // also handle empty strings → NULL
      return [key, value];
    })
  );
