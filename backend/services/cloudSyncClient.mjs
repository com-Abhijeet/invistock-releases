import { io } from "socket.io-client";
import axios from "axios";
import crypto from "crypto";
import { EventEmitter } from "events";

export const cloudSyncEmitter = new EventEmitter();

let socket = null;
let currentBusinessId = null;
const KOSH_PROXY_URL = "wss://api.getkosh.co.in";
const LOCAL_API_URL = "http://localhost:5000";

// AES-256-GCM Encryption Helper
function encryptPayload(payload, businessId) {
  // Derive a 32-byte key from the businessId
  const key = crypto.scryptSync(businessId, 'salt', 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const payloadString = JSON.stringify(payload);
  let encrypted = cipher.update(payloadString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag
  };
}

export function getCloudSyncStatus() {
  return socket ? socket.connected : false;
}

export function connectCloudSync(businessId) {
  if (!businessId) {
    console.error("[CloudSync] Cannot connect: Missing businessId");
    return;
  }

  if (socket && socket.connected) {
    if (currentBusinessId === businessId) {
      console.log("[CloudSync] Already connected.");
      return;
    }
    socket.disconnect();
  }

  currentBusinessId = businessId;
  console.log(`[CloudSync] Connecting to proxy at ${KOSH_PROXY_URL} for ${businessId}...`);

  socket = io(KOSH_PROXY_URL, {
    query: { businessId },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  socket.on("connect", () => {
    console.log("[CloudSync] Connected to Kosh Platform Proxy!");
    cloudSyncEmitter.emit("status-changed", true);
    startHeartbeat();
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[CloudSync] Disconnected from proxy. Reason: ${reason}`);
    cloudSyncEmitter.emit("status-changed", false);
    stopHeartbeat();
  });

  socket.on("proxy_request", async (data) => {
    const { requestId, method, url, headers, body } = data;
    console.log(`[CloudSync] Received proxy request [${requestId}]: ${method} ${url}`);

    try {
      const response = await axios({
        method: method,
        url: `${LOCAL_API_URL}${url}`,
        headers: headers,
        data: body,
        validateStatus: () => true // Resolve all HTTP statuses
      });

      // Encrypt the response body before sending it back
      const encryptedBody = encryptPayload(response.data, businessId);

      socket.emit("proxy_response", {
        requestId,
        statusCode: response.status,
        headers: response.headers,
        body: encryptedBody
      });

    } catch (error) {
      console.error(`[CloudSync] Error routing request [${requestId}]:`, error.message);
      socket.emit("proxy_response", {
        requestId,
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: encryptPayload({ success: false, message: "Local processing failed" }, businessId)
      });
    }
  });
}

export function disconnectCloudSync() {
  if (socket) {
    socket.disconnect();
    socket = null;
    cloudSyncEmitter.emit("status-changed", false);
  }
  currentBusinessId = null;
  console.log("[CloudSync] Disconnected manually.");
  stopHeartbeat();
}

// --- Heartbeat to prevent socket suspension ---
let heartbeatInterval = null;

function startHeartbeat() {
  stopHeartbeat();
  // Ping every 10 minutes (600,000 ms)
  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit("ping", (reply) => {
        console.log(`[CloudSync] Heartbeat sent: ${reply}`);
      });
    }
  }, 10 * 60 * 1000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
