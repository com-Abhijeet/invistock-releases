import axios from "axios";

// 1. Create the base axios instance.
//    It defaults to localhost, which is correct for the SERVER app.
const api = axios.create({
  baseURL: "http://localhost:5000",
});

/**
 * Call this function from the main app to redirect all API calls.
 */
export function setApiBaseUrl(url: string) {
  console.log(`[API] Base URL set to: ${url}`);
  api.defaults.baseURL = url;
}

// 2. ❌ The 'window.electron.onSetServerUrl' listener is removed from here.
//    This logic is now handled in your AppInitializer component for
//    better state management and to prevent the app from loading
//    before the URL is set.

export { api };
