import { api } from '../lib/api/api';

export const getTallyConfigs = async () => {
    const res = await api.get(`/api/tally/config`);
    return res.data;
};

export const saveTallyConfigs = async (configs: Record<string, string>) => {
    const res = await api.post(`/api/tally/config`, configs);
    return res.data;
};

export const getTallyLogs = async (limit: number = 100) => {
    const res = await api.get(`/api/tally/logs?limit=${limit}`);
    return res.data;
};

export const pingTally = async () => {
    const res = await api.get(`/api/tally/ping`);
    return res.data;
};

// Sync via REST
export const syncTally = async (type: string, startDate?: string, endDate?: string) => {
    const res = await api.post(`/api/tally/sync`, { type, startDate, endDate });
    return res.data;
};

export const syncBaseConfigs = async () => {
    const res = await api.post(`/api/tally/sync-base-configs`);
    return res.data;
};

export const resetTallySyncMemory = async () => {
    const res = await api.post(`/api/tally/reset-sync`);
    return res.data;
};

// For SSE, we use native EventSource in the component.
