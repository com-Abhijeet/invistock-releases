const https = require("https");

/**
 * Attempts to get a Marathi *translation* from Google's Translate API.
 * Returns the original English text if offline, on error, or on timeout.
 * @param {string} text - The English text to translate.
 * @returns {Promise<string>} A promise that resolves to the Marathi or original English text.
 */
async function getMarathiName(text) {
  if (!text || !text.trim()) {
    return text; // Return original text if input is empty
  }

  const encodedText = encodeURIComponent(text);
  // ✅ Using the Google Translate API endpoint
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mr&dt=t&q=${encodedText}`;

  return new Promise((resolve) => {
    // Increased timeout to 3 seconds
    const request = https.get(url, { timeout: 3000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          // ✅ This is the parser for the Translate API
          const marathiName = json[0][0][0];
          resolve(marathiName || text);
        } catch (e) {
          console.error(
            "[Translate] Failed to parse JSON response:",
            e.message
          );
          resolve(text); // If parsing fails, return original English
        }
      });
    });

    request.on("error", (err) => {
      console.error(`[Translate] Network error: ${err.message}`);
      resolve(text); // Return original text
    });

    request.on("timeout", () => {
      request.destroy();
      console.warn(`[Translate] Request timed out for: ${text}`);
      resolve(text); // Return original text
    });
  });
}

module.exports = { getMarathiName };
