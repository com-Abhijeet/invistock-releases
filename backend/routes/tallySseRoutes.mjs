import express from "express";
import { tallyService } from "../services/tallyService.mjs";

const router = express.Router();

// SSE Route for real-time sync streaming
router.get("/sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const emitCb = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write(": keep-alive\n\n");
    }, 15000);

    const type = req.query.type;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const runSync = async () => {
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
                emitCb({ type: 'error', message: "Invalid sync type" });
            }
            emitCb({ type: 'done', message: "Sync process finished." });
        } catch (error) {
            emitCb({ type: 'error', message: error.message });
        } finally {
            clearInterval(keepAlive);
            res.end();
        }
    };

    runSync();
    
    req.on("close", () => {
        clearInterval(keepAlive);
        res.end();
    });
});

export default router;
