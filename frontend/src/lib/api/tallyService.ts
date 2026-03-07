import { api } from "./api";

export interface TallySettings {
  id?: number;
  sync_mode?: string;
  tally_url: string;
  company_name?: string;
  sales_ledger: string;
  purchase_ledger: string;
  cash_ledger: string;
  bank_ledger: string;
  cgst_ledger: string;
  sgst_ledger: string;
  igst_ledger: string;
  discount_ledger: string;
  default_expense_ledger?: string;
  round_off_ledger: string;
}

export interface TallyErrorLog {
  entity_type: string;
  entity_id: number;
  action_type: string;
  error_log: string;
  retry_count: number;
}

export interface TallyStatus {
  stats: {
    pending: number;
    failed: number;
    synced: number;
  };
  recentFailed: TallyErrorLog[];
  breakdown: { entity_type: string; total: number }[];
}

export const getTallySettings = async (): Promise<TallySettings> => {
  const response = await api.get("/api/tally/settings");
  return response.data.data;
};

export const saveTallySettings = async (
  settings: TallySettings,
): Promise<string> => {
  const response = await api.post("/api/tally/settings", settings);
  return response.data.message;
};

export const getTallyStatus = async (): Promise<TallyStatus> => {
  const response = await api.get("/api/tally/status");
  return response.data;
};

export const runManualSync = async (): Promise<{
  changesFound: number;
  details: string;
}> => {
  const response = await api.post("/api/tally/sync/manual");
  return response.data;
};

export const resetSyncQueue = async (): Promise<string> => {
  const response = await api.post("/api/tally/sync/reset");
  return response.data.message;
};
