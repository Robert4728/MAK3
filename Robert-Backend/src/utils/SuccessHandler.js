/**
 * Utility to convert a string to kebab-case.
 */
const toKebabCase = (str) => {
  return str
    .replace(/\$/g, "") // remove dollar signs first
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/[-\s]+/g, "_")
    .replace(/--+/g, "_")
    .replace(/^-|-$/g, "");
};

/**
 * Recursively cleans an object by:
 * - Removing null/undefined/empty values
 * - Removing unwanted $fields
 * - Renaming $id → id
 * - Converting keys to kebab-case
 */
const cleanObject = (obj) => {
  if (Array.isArray(obj)) {
    const cleanedArray = obj
      .map(cleanObject)
      .filter((v) => v !== null && v !== undefined);
    return cleanedArray.length ? cleanedArray : undefined;
  }

  if (obj && typeof obj === "object") {
    const newObj = {};

    for (const key in obj) {
      if (!Object.hasOwn(obj, key)) continue;
      let value = obj[key];

      // Remove null or undefined
      if (value === null || value === undefined) continue;

      // Clean nested structures first
      if (typeof value === "object") {
        value = cleanObject(value);
        if (
          value === undefined ||
          (typeof value === "object" && Object.keys(value).length === 0)
        )
          continue;
      }

      // Skip internal system fields
      if (
        [
          "$sequence",
          "$createdAt",
          "$updatedAt",
          "$permissions",
          "$databaseId",
          "$tableId",
        ].includes(key)
      )
        continue;

      // Rename $id → id
      let newKey = key === "$id" ? "id" : toKebabCase(key);

      newObj[newKey] = value;
    }

    return Object.keys(newObj).length > 0 ? newObj : undefined;
  }

  return obj;
};

/**
 * Unified success handler with cleaning, kebab-casing, and smart shaping.
 */
const SuccessHandler = (message, statusCode, res, data = {}) => {
  const cleanedData = cleanObject(data);

  const response = {
    success: true,
    message,
    statusCode,
    data: cleanedData ?? {},
  };

  return res.status(statusCode).json(response);
};

export default SuccessHandler;