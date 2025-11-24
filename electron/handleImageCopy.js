const { app } = require("electron");
const path = require("path");
const fs = require("fs").promises;

/**
 * A generic function that copies a source image to a specific subfolder
 * within the app's user data directory (works in standard or portable mode).
 * @param {string} sourcePath - The full path of the image file to copy.
 * @param {'products' | 'logo'} subfolder - The target subfolder inside the 'images' directory.
 * @returns {Promise<string>} The new, unique filename of the copied image.
 */
async function copyImageToAppData(sourcePath, subfolder) {
  try {
    // 1. Get the correct user data path (this works for both modes).
    const userDataPath = app.getPath("userData");

    // 2. Define the target directory path using the subfolder.
    const targetDir = path.join(userDataPath, "images", subfolder);

    // 3. Ensure the target directory exists.
    await fs.mkdir(targetDir, { recursive: true });

    // 4. Create a unique filename to prevent conflicts.
    const fileExtension = path.extname(sourcePath);
    const newFileName = `${Date.now()}${fileExtension}`;
    const destinationPath = path.join(targetDir, newFileName);

    // 5. Copy the file.
    await fs.copyFile(sourcePath, destinationPath);

    // 6. Return only the new filename for storage in the database.
    return newFileName;
  } catch (error) {
    console.error(`Failed to copy image to subfolder "${subfolder}":`, error);
    throw new Error(`Could not save the image file.`);
  }
}

/**
 * @description Copies a selected image to the 'products' folder.
 * @param {string} originalPath The full path of the product image.
 * @returns {Promise<string>} The new filename.
 */
async function copyProductImage(originalPath) {
  return copyImageToAppData(originalPath, "products");
}

/**
 * @description Copies a selected image to the 'logo' folder.
 * @param {string} originalPath The full path of the logo image.
 * @returns {Promise<string>} The new filename.
 */
async function copyLogoImage(originalPath) {
  return copyImageToAppData(originalPath, "logo");
}

// ✅ Correctly export both functions so they can be imported in main.js
module.exports = {
  copyProductImage,
  copyLogoImage,
};
