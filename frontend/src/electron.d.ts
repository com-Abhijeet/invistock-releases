// This declares that a global 'window' object exists with an 'electron' property.
declare global {
  interface Window {
    electron: {
      removeSetAppMode: any;
      removeSetServerUrl: any;
      checkForUpdates: () => Promise<void>;
      restartApp: () => Promise<void>;
      getServerUrl(): string;
      onSetAppMode: any;
      getAppMode: () => Promise<string>;
      onSetAppMode: (callback: (mode: "server" | "client") => void) => void;
      onSetServerUrl(arg0: (url: string) => void): unknown;
      getLocalIp: () => Promise<string>;
      ipcRenderer: {
        on(
          arg0: string,
          handleProgressUpdate: (
            _event: any,
            progress: { current: number; total: number }
          ) => void
        ): unknown;
        removeAllListeners: any;
        send: (channel: string, data?: any) => void;
        invoke: (channel: string, data?: any) => Promise<any>;
      };
      getWhatsAppStatus: () => Promise<{ status: string; qr: string | null }>;
      sendWhatsAppMessage: (
        phone: string,
        message: string
      ) => Promise<{ success: boolean; error?: string }>;
      onWhatsAppUpdate: (
        callback: (data: { status: string; qr: string | null }) => void
      ) => void;
      sendWhatsAppInvoicePdf: (payload: {
        sale: any;
        shop: any;
        customerPhone: string;
      }) => Promise<{ success: boolean; error?: string }>;
      getGDriveStatus: () => Promise<boolean>;
      loginGDrive: () => Promise<{ success: boolean; message?: string }>;
      onGDriveConnected: (callback: () => void) => void;
    };
  }
}

// This line is needed to make the file a module.
export {};
