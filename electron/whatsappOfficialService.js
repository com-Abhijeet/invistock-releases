/**
 * Official Meta WhatsApp Business Cloud API Integration Service
 * Uses standard Meta Graph API endpoints v19.0
 */

async function testOfficialConnection({ phoneNumberId, accessToken }) {
  if (!phoneNumberId || !accessToken) {
    return {
      success: false,
      error: "Phone Number ID and Access Token are required.",
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=id,verified_name,display_phone_number`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg =
        data?.error?.message ||
        `Failed with status code ${response.status}`;
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      displayPhoneNumber: data.display_phone_number || data.id,
      verifiedName: data.verified_name || "WhatsApp Business Account",
    };
  } catch (error) {
    console.error("[WHATSAPP-OFFICIAL] Connection test error:", error);
    return { success: false, error: error.message };
  }
}

async function fetchMetaTemplates({ wabaId, accessToken }) {
  if (!wabaId || !accessToken) {
    throw new Error("WABA Account ID and Access Token are required to sync Meta templates.");
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Meta API error: ${errMsg}`);
    }

    return { success: true, templates: data.data || [] };
  } catch (error) {
    console.error("[WHATSAPP-OFFICIAL] Fetch Meta templates error:", error);
    return { success: false, error: error.message };
  }
}

async function registerMetaTemplate({ wabaId, accessToken, template }) {
  if (!wabaId || !accessToken) {
    throw new Error("WABA Account ID and Access Token are required.");
  }

  const templateName = (template.meta_template_name || template.name)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  // Convert named placeholders {{Name}} -> {{1}}
  let paramIndex = 1;
  const paramMap = new Map();
  const bodyText = (template.content || "").replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, paramName) => {
    if (!paramMap.has(paramName)) {
      paramMap.set(paramName, paramIndex++);
    }
    return `{{${paramMap.get(paramName)}}}`;
  });

  const components = [];

  if (template.header_format === "DOCUMENT" || template.category === "invoice" || template.category === "ledgers") {
    components.push({
      type: "HEADER",
      format: "DOCUMENT",
      example: {
        header_handle: ["https://getkosh.co.in/sample-invoice.pdf"],
      },
    });
  } else if (template.header || template.header_text) {
    const headerText = template.header || template.header_text;
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: headerText,
      example: {
        header_text: [headerText],
      },
    });
  }

  components.push({
    type: "BODY",
    text: bodyText,
  });

  const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;
  const payload = {
    name: templateName,
    category: category,
    allow_category_change: true,
    language: template.language || "en_US",
    components: components,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `HTTP ${response.status}`;
    if (errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
      return { success: true, status: "APPROVED", id: data?.id || templateName, templateName };
    }
    if (errorMsg.includes("being deleted") || errorMsg.includes("4 weeks")) {
      const fallbackName = `${templateName}_v2`;
      console.log(`[WHATSAPP-OFFICIAL] Template '${templateName}' is in Meta deletion lock. Retrying as '${fallbackName}'...`);
      payload.name = fallbackName;
      const retryResponse = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const retryData = await retryResponse.json();
      if (retryResponse.ok) {
        return { success: true, status: retryData.status || "PENDING", id: retryData.id, templateName: fallbackName };
      }
    }
    throw new Error(`Meta submission error: ${errorMsg}`);
  }

  return {
    success: true,
    status: data.status || "PENDING",
    id: data.id,
    templateName,
  };
}

async function sendOfficialTextMessage({
  phoneNumberId,
  accessToken,
  phone,
  message,
}) {
  if (!phoneNumberId || !accessToken) {
    throw new Error("Meta API Phone Number ID or Access Token is missing.");
  }

  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: {
      preview_url: false,
      body: message,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorDetail =
      data?.error?.message ||
      data?.error?.error_user_msg ||
      `HTTP ${response.status}`;
    throw new Error(`Meta Cloud API Error: ${errorDetail}`);
  }

  return { success: true, response: data };
}

async function sendOfficialPdf({
  phoneNumberId,
  accessToken,
  phone,
  pdfBase64,
  fileName,
  caption,
}) {
  if (!phoneNumberId || !accessToken) {
    throw new Error("Meta API Phone Number ID or Access Token is missing.");
  }

  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

  // 1. Upload Media (PDF Buffer) to Meta Media Endpoint
  const buffer = Buffer.from(pdfBase64, "base64");
  const mediaUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/media`;

  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", "application/pdf");
  const blob = new Blob([buffer], { type: "application/pdf" });
  formData.append("file", blob, fileName || "document.pdf");

  const mediaResponse = await fetch(mediaUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const mediaData = await mediaResponse.json();

  if (!mediaResponse.ok || !mediaData.id) {
    const errorDetail =
      mediaData?.error?.message || `HTTP ${mediaResponse.status}`;
    throw new Error(`Meta Media Upload Failed: ${errorDetail}`);
  }

  const mediaId = mediaData.id;

  // 2. Send Document Message referencing uploaded Media ID
  const messageUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "document",
    document: {
      id: mediaId,
      filename: fileName || "document.pdf",
      caption: caption || "",
    },
  };

  const docResponse = await fetch(messageUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const docData = await docResponse.json();

  if (!docResponse.ok) {
    const errorDetail =
      docData?.error?.message || `HTTP ${docResponse.status}`;
    throw new Error(`Meta Document Delivery Failed: ${errorDetail}`);
  }

  return { success: true, response: docData };
}

async function sendOfficialTemplateMessage({
  phoneNumberId,
  accessToken,
  phone,
  templateName,
  language = "en_US",
  params = [],
  pdfBase64 = null,
  pdfUrl = null,
  fileName = "Invoice.pdf",
}) {
  if (!phoneNumberId || !accessToken) {
    throw new Error("Meta API Phone Number ID or Access Token is missing.");
  }

  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

  const components = [];

  // If document payload is provided, attach document header parameter
  if (pdfBase64 || pdfUrl) {
    let documentObj = null;
    if (pdfBase64) {
      try {
        const buffer = Buffer.from(pdfBase64, "base64");
        const mediaUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/media`;
        const formData = new FormData();
        formData.append("messaging_product", "whatsapp");
        formData.append("type", "application/pdf");
        const blob = new Blob([buffer], { type: "application/pdf" });
        formData.append("file", blob, fileName || "document.pdf");

        const mediaResponse = await fetch(mediaUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        const mediaData = await mediaResponse.json();
        if (mediaResponse.ok && mediaData.id) {
          documentObj = { id: mediaData.id, filename: fileName || "document.pdf" };
        } else if (pdfUrl) {
          documentObj = { link: pdfUrl, filename: fileName || "document.pdf" };
        }
      } catch (e) {
        if (pdfUrl) documentObj = { link: pdfUrl, filename: fileName || "document.pdf" };
      }
    } else if (pdfUrl) {
      documentObj = { link: pdfUrl, filename: fileName || "document.pdf" };
    }

    if (documentObj && (documentObj.id || documentObj.link)) {
      components.push({
        type: "header",
        parameters: [
          {
            type: "document",
            document: documentObj,
          },
        ],
      });
    }
  }

  // Add body text parameters if provided
  if (params && params.length > 0) {
    components.push({
      type: "body",
      parameters: params.map((p) => ({
        type: "text",
        text: String(p || ""),
      })),
    });
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: components.length > 0 ? components : undefined,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorDetail = data?.error?.message || data?.error?.error_user_msg || `HTTP ${response.status}`;
    throw new Error(`Meta Cloud Template Error: ${errorDetail}`);
  }

  return { success: true, response: data };
}

module.exports = {
  testOfficialConnection,
  fetchMetaTemplates,
  registerMetaTemplate,
  sendOfficialTextMessage,
  sendOfficialPdf,
  sendOfficialTemplateMessage,
};
