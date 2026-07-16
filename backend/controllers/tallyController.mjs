import { tallyService } from "../services/tallyService.mjs";
import { getSyncLogs, resetSyncLogs } from "../db/tallyDb.mjs";

export const getConfigs = async (req, res) => {
    try {
        const configs = tallyService.getConfigs();
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const saveConfigs = async (req, res) => {
    try {
        const configs = tallyService.saveConfigs(req.body);
        res.json({ message: "Configs saved", configs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = getSyncLogs(limit);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const pingTally = async (req, res) => {
    try {
        const result = await tallyService.pingTally();
        // Even if we get an XML parse error, if we didn't get a connection refused, Tally is likely reachable.
        if (result.error && result.error.includes("Could not connect")) {
            return res.json({ connected: false, message: result.error });
        }
        res.json({ connected: true, message: "Tally is reachable on the configured port." });
    } catch (error) {
        res.status(500).json({ connected: false, message: error.message });
    }
};

export const syncData = async (req, res) => {
    const { type, startDate, endDate } = req.body;
    
    // For normal REST response, we won't use SSE. We will collect logs and return them.
    const logs = [];
    const emitCb = (data) => {
        logs.push(data);
    };

    try {
        if (type === 'masters') {
            await tallyService.syncMasters(emitCb);
        } else if (type === 'sales') {
            await tallyService.syncSales(startDate, endDate, emitCb);
        } else if (type === 'purchases') {
            await tallyService.syncPurchases(startDate, endDate, emitCb);
        } else if (type === 'transactions') {
            await tallyService.syncTransactions(startDate, endDate, emitCb);
        } else if (type === 'expenses') {
            await tallyService.syncExpenses(startDate, endDate, emitCb);
        } else {
            return res.status(400).json({ error: "Invalid sync type" });
        }

        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, logs });
    }
};

export const syncBaseConfigs = async (req, res) => {
    try {
        await tallyService.ensureBaseLedgers((level, message) => {
            console.log(`[TALLY CONFIG SYNC] [${level.toUpperCase()}] ${message}`);
        });
        res.json({ success: true, message: "Base Configs and UOMs successfully verified/created in Tally." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const resetSync = async (req, res) => {
    try {
        resetSyncLogs();
        res.json({ success: true, message: "Sync memory reset successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
