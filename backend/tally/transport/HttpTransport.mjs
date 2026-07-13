import { ResponseParser } from "./ResponseParser.mjs";
import { TallyLogger } from "../handlers/TallyLogger.mjs";

export class HttpTransport {
  /**
   * Sends XML to Tally ODBC endpoint
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async send(url, payload, entityType = "Unknown", entityId = 0) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: payload,
      });
      const responseText = await response.text();

      const result = ResponseParser.parse(responseText);

      // Log to file for diagnostics
      TallyLogger.log(entityType, entityId, payload, responseText, result.success, result.message);

      return result;
    } catch (error) {
      TallyLogger.log(entityType, entityId, payload, `HTTP Error: ${error.message}`, false, error.message);
      throw new Error(`Connection to Tally failed: ${error.message}`);
    }
  }
}
