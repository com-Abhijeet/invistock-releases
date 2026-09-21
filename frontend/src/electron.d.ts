// This declares that a global 'window' object exists with an 'electron' property.

export interface UpdateInfo {
  version: string;
  files: Array<{ url: string; sha512: string; size: number }>;
  path: string;
  sha512: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string | Array<any>;
}

export interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export interface UpdaterAPI {
  checkForUpdates: () => Promise<void>;
  restartApp: () => Promise<void>;
  getAppVersion: () => Promise<string>;

  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  onDownloadProgress: (callback: (progress: ProgressInfo) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electron: {
      updater: UpdaterAPI;
      removeSetAppMode: any;
      removeSetServerUrl: any;
      checkForUpdates: () => Promise<void>;
      getMachineId: () => Promise<string>;
      restartApp: () => Promise<void>;
      getServerUrl(): string;
      onSetAppMode: any;
      getAppMode: () => Promise<string>;
      onSetAppMode: (callback: (mode: "server" | "client") => void) => void;
      onSetServerUrl(arg0: (url: string) => void): unknown;
      getLocalIp: () => Promise<string>;
      connectCloudSync: (businessId: string) => Promise<{ success: boolean; error?: string }>;
      disconnectCloudSync: () => Promise<{ success: boolean; error?: string }>;
      getCloudSyncStatus: () => Promise<boolean>;
      onCloudSyncStatus: (callback: (status: boolean) => void) => void;
      ipcRenderer: {
        on(
          arg0: string,
          handleProgressUpdate: (
            _event: any,
            progress: { current: number; total: number },
          ) => void,
        ): unknown;
        removeAllListeners: any;
        send: (channel: string, ...args: any[]) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
      getWhatsAppStatus: () => Promise<{ status: string; qr: string | null }>;
      sendWhatsAppMessage: (
        phone: string,
        message: string,
        category?: string,
      ) => Promise<{ success: boolean; error?: string }>;
      onWhatsAppUpdate: (
        callback: (data: { status: string; qr: string | null }) => void,
      ) => void;
      sendWhatsAppInvoicePdf: (payload: {
        sale: any;
        shop: any;
        customerPhone: string;
      }) => Promise<{ success: boolean; error?: string }>;
      sendWhatsAppCustomerLedger: (payload: {
        customerId: number;
        phone: string;
        filters: any;
      }) => Promise<{ success: boolean; error?: string }>;
      getWhatsAppSettings: () => Promise<{
        success: boolean;
        settings?: any;
        error?: string;
      }>;
      saveWhatsAppSettings: (
        data: any,
      ) => Promise<{ success: boolean; settings?: any; error?: string }>;
      testWhatsAppOfficial: (credentials: {
        phoneNumberId: string;
        accessToken: string;
      }) => Promise<{
        success: boolean;
        displayPhoneNumber?: string;
        verifiedName?: string;
        error?: string;
      }>;
      testWhatsAppMsg91: (credentials: {
        authKey: string;
        integratedNumber: string;
      }) => Promise<{
        success: boolean;
        displayPhoneNumber?: string;
        verifiedName?: string;
        error?: string;
      }>;
      openMsg91EmbeddedSignup: () => Promise<{ success: boolean }>;
      onMsg91SignupCaptured: (
        callback: (data: { authKey?: string; integratedNumber?: string }) => void,
      ) => void;
      getWhatsAppAnalytics: (
        days?: number,
      ) => Promise<{ success: boolean; stats?: any[]; error?: string }>;
      getWhatsAppTemplates: (
        category?: string,
      ) => Promise<{ success: boolean; templates?: any[]; error?: string }>;
      saveWhatsAppTemplate: (
        data: any,
      ) => Promise<{ success: boolean; error?: string }>;
      deleteWhatsAppTemplate: (
        id: number,
      ) => Promise<{ success: boolean; error?: string }>;
      setDefaultWhatsAppTemplate: (
        id: number,
        category: string,
      ) => Promise<{ success: boolean; error?: string }>;
      verifyMetaTemplates: () => Promise<{
        success: boolean;
        templates?: any[];
        syncedCount?: number;
        error?: string;
      }>;
      registerAllWhatsAppTemplates: () => Promise<{
        success: boolean;
        templates?: any[];
        registeredCount?: number;
        errorCount?: number;
        errors?: string[];
        error?: string;
      }>;
      registerSingleWhatsAppTemplate: (id: number) => Promise<{
        success: boolean;
        status?: string;
        template?: any;
        templates?: any[];
        error?: string;
      }>;
      verifySingleWhatsAppTemplate: (id: number) => Promise<{
        success: boolean;
        status?: string;
        template?: any;
        templates?: any[];
        error?: string;
      }>;
      getGDriveStatus: () => Promise<boolean>;
      loginGDrive: () => Promise<{ success: boolean; message?: string }>;
      getGDriveTokenExpiry: () => Promise<number | null>; // milliseconds or null
      checkGDriveTokenExpiry: () => Promise<void>;
      onGDriveConnected: (callback: () => void) => void;
      onGDriveTokenExpiring: (
        callback: (data: { daysUntilExpiry: number }) => void,
      ) => void;
      onGDriveTokenExpired: (callback: () => void) => void;
    };
    minimizeApp: () => void;
    maximizeApp: () => void;
    closeApp: () => void;
  }
}

export {};
