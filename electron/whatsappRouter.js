const {
  sendWhatsAppMessage,
  sendWhatsAppPdf,
} = require("./whatsappService");
const {
  sendOfficialTextMessage,
  sendOfficialPdf,
  sendOfficialTemplateMessage,
} = require("./whatsappOfficialService");
const {
  sendMsg91TextMessage,
  sendMsg91PdfDocument,
  sendMsg91TemplateMessage,
} = require("./whatsappMsg91Service");

async function getSettingsRepo() {
  return await import("../backend/repositories/whatsappSettingsRepository.mjs");
}

/**
 * Route text message to Official Provider (MSG91 / Meta Cloud) or Unofficial Baileys based on category settings.
 */
async function routeAndSendMessage({ category = "general", phone, message }) {
  const { getWhatsAppSettings, logWhatsAppMessage } = await getSettingsRepo();
  const settings = getWhatsAppSettings();

  // Determine route preference
  let categoryRoute = "unofficial";
  if (category === "invoice") categoryRoute = settings.route_invoice;
  else if (category === "ledgers") categoryRoute = settings.route_ledgers;
  else if (category === "marketing") categoryRoute = settings.route_marketing;
  else if (category === "outstandings") categoryRoute = settings.route_outstandings;

  let route = categoryRoute || "unofficial";

  const isOfficialConfigured =
    settings.official_enabled ||
    (settings.official_provider === "msg91" && settings.msg91_auth_key) ||
    (settings.official_provider === "meta_direct" && settings.official_access_token);

  if (route === "official" || (isOfficialConfigured && route !== "unofficial" && route !== "none")) {
    route = "official";
  }

  if (route === "none") {
    throw new Error(`WhatsApp messaging is disabled for ${category}.`);
  }

  if (route === "official") {
    const provider = settings.official_provider || "msg91";

    if (provider === "msg91") {
      if (!settings.msg91_auth_key || !settings.msg91_integrated_number) {
        throw new Error("MSG91 Auth Key or Registered Number is missing in Settings.");
      }

      try {
        const res = await sendMsg91TextMessage({
          authKey: settings.msg91_auth_key,
          integratedNumber: settings.msg91_integrated_number,
          phone,
          message,
        });

        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "sent",
        });

        return res;
      } catch (err) {
        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "failed",
          error_message: err.message,
        });
        throw err;
      }
    } else {
      // Direct Meta Cloud API
      if (!settings.official_phone_number_id || !settings.official_access_token) {
        throw new Error("Meta Official WhatsApp API details are missing in Settings.");
      }

      try {
        const res = await sendOfficialTextMessage({
          phoneNumberId: settings.official_phone_number_id,
          accessToken: settings.official_access_token,
          phone,
          message,
        });

        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "sent",
        });

        return res;
      } catch (err) {
        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "failed",
          error_message: err.message,
        });
        throw err;
      }
    }
  } else {
    // Unofficial (Baileys)
    try {
      const res = await sendWhatsAppMessage(phone, message);
      logWhatsAppMessage({
        provider: "unofficial",
        category,
        recipient: phone,
        status: "sent",
      });
      return res;
    } catch (err) {
      logWhatsAppMessage({
        provider: "unofficial",
        category,
        recipient: phone,
        status: "failed",
        error_message: err.message,
      });
      throw err;
    }
  }
}

/**
 * Route PDF document to Official Provider (MSG91 / Meta Cloud) or Unofficial Baileys based on category settings.
 */
async function routeAndSendPdf({
  category = "invoice",
  phone,
  pdfBase64,
  pdfUrl,
  fileName,
  caption,
  templateName,
  templateParams = [],
}) {
  const { getWhatsAppSettings, logWhatsAppMessage } = await getSettingsRepo();
  const settings = getWhatsAppSettings();

  let categoryRoute = "unofficial";
  if (category === "invoice") categoryRoute = settings.route_invoice;
  else if (category === "ledgers") categoryRoute = settings.route_ledgers;
  else if (category === "marketing") categoryRoute = settings.route_marketing;
  else if (category === "outstandings") categoryRoute = settings.route_outstandings;

  let route = categoryRoute || "unofficial";

  const isOfficialConfigured =
    settings.official_enabled ||
    (settings.official_provider === "msg91" && settings.msg91_auth_key) ||
    (settings.official_provider === "meta_direct" && settings.official_access_token);

  if (route === "official" || (isOfficialConfigured && route !== "unofficial" && route !== "none")) {
    route = "official";
  }

  if (route === "none") {
    throw new Error(`WhatsApp PDF sending is disabled for ${category}.`);
  }

  if (route === "official") {
    const provider = settings.official_provider || "msg91";

    if (provider === "msg91") {
      if (!settings.msg91_auth_key || !settings.msg91_integrated_number) {
        throw new Error("MSG91 Auth Key or Registered Number is missing in Settings.");
      }

      try {
        let res;
        if (templateName) {
          try {
            res = await sendMsg91TemplateMessage({
              authKey: settings.msg91_auth_key,
              integratedNumber: settings.msg91_integrated_number,
              phone,
              templateName,
              params: templateParams,
              pdfUrl,
              fileName,
            });
          } catch (tplErr) {
            console.warn(`[WHATSAPP-MSG91] Template dispatch failed, falling back to document dispatch:`, tplErr.message);
            res = await sendMsg91PdfDocument({
              authKey: settings.msg91_auth_key,
              integratedNumber: settings.msg91_integrated_number,
              phone,
              pdfBase64,
              pdfUrl,
              fileName,
              caption,
              templateName,
            });
          }
        } else {
          res = await sendMsg91PdfDocument({
            authKey: settings.msg91_auth_key,
            integratedNumber: settings.msg91_integrated_number,
            phone,
            pdfBase64,
            pdfUrl,
            fileName,
            caption,
            templateName,
          });
        }

        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "sent",
        });

        return res;
      } catch (err) {
        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "failed",
          error_message: err.message,
        });
        throw err;
      }
    } else {
      // Direct Meta Cloud API
      if (!settings.official_phone_number_id || !settings.official_access_token) {
        throw new Error("Meta Official WhatsApp API details are missing in Settings.");
      }

      try {
        let res;
        if (templateName) {
          try {
            res = await sendOfficialTemplateMessage({
              phoneNumberId: settings.official_phone_number_id,
              accessToken: settings.official_access_token,
              phone,
              templateName,
              params: templateParams,
              pdfBase64,
              pdfUrl,
              fileName,
            });
          } catch (tplErr) {
            console.warn(`[WHATSAPP-OFFICIAL] Template dispatch failed, falling back to pdf upload:`, tplErr.message);
            res = await sendOfficialPdf({
              phoneNumberId: settings.official_phone_number_id,
              accessToken: settings.official_access_token,
              phone,
              pdfBase64,
              fileName,
              caption,
              templateName,
            });
          }
        } else {
          res = await sendOfficialPdf({
            phoneNumberId: settings.official_phone_number_id,
            accessToken: settings.official_access_token,
            phone,
            pdfBase64,
            fileName,
            caption,
            templateName,
          });
        }

        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "sent",
        });

        return res;
      } catch (err) {
        logWhatsAppMessage({
          provider: "official",
          category,
          recipient: phone,
          status: "failed",
          error_message: err.message,
        });
        throw err;
      }
    }
  } else {
    // Unofficial (Baileys)
    try {
      const res = await sendWhatsAppPdf(phone, pdfBase64, fileName, caption);
      logWhatsAppMessage({
        provider: "unofficial",
        category,
        recipient: phone,
        status: "sent",
      });
      return res;
    } catch (err) {
      logWhatsAppMessage({
        provider: "unofficial",
        category,
        recipient: phone,
        status: "failed",
        error_message: err.message,
      });
      throw err;
    }
  }
}

module.exports = {
  routeAndSendMessage,
  routeAndSendPdf,
};
