const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const config = require("./config.js");

// 🔒 DEVELOPER KEYS (Hardcoded or from .env during build)
// These are YOUR keys. The user never sees them.
const CLIENT_ID = "928775221732-m6td1rgjf8v59kmm7jn900jbtnd9j7kh";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://127.0.0.1:5001/callback";

const TOKEN_PATH = path.join(config.paths.userData, "gdrive_token.json");
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Load token if exists
if (fs.existsSync(TOKEN_PATH)) {
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(token);
}

/**
 * 1. Get the Login URL
 * We force 'offline' access to get a Refresh Token for long-term automation.
 */
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Critical: Gives us a Refresh Token
    prompt: "consent", // Critical: Forces Google to give the token
    scope: SCOPES,
  });
}

/**
 * 2. Save the Credentials (The "Handshake")
 */
async function handleAuthCallback(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  // Save to disk so we remember them after restart
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return true;
}

/**
 * 3. The "Auto-Backup" Function
 * Checks if token works. If expired, it auto-refreshes using the refresh_token.
 */
async function uploadBackup(filePath, fileName) {
  if (!fs.existsSync(TOKEN_PATH))
    return { success: false, error: "Not connected" };

  try {
    // Automatically refreshes token if needed
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // A. Check/Create "KOSH Backups" folder
    let folderId;
    const q =
      "mimeType='application/vnd.google-apps.folder' and name='KOSH Backups' and trashed=false";
    const folderRes = await drive.files.list({ q, fields: "files(id, name)" });

    if (folderRes.data.files.length > 0) {
      folderId = folderRes.data.files[0].id;
    } else {
      const newFolder = await drive.files.create({
        resource: {
          name: "KOSH Backups",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      folderId = newFolder.data.id;
    }

    // B. Upload File
    const res = await drive.files.create({
      resource: { name: fileName, parents: [folderId] },
      media: {
        mimeType: "application/octet-stream",
        body: fs.createReadStream(filePath),
      },
      fields: "id",
    });

    console.log("[GDRIVE] Upload success:", res.data.id);
    return { success: true };
  } catch (error) {
    console.error("[GDRIVE] Upload failed:", error.message);
    return { success: false, error: error.message };
  }
}

function isConnected() {
  return fs.existsSync(TOKEN_PATH);
}

module.exports = { getAuthUrl, handleAuthCallback, uploadBackup, isConnected };
