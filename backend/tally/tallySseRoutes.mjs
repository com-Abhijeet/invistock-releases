import express from "express";
import { EventEmitter } from "events";

export const syncEventEmitter = new EventEmitter();
const router = express.Router();

router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send an initial connected message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Tally Sync Engine Live' })}\n\n`);

  const onLog = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'log', ...data })}\n\n`);
  };

  const onProgress = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`);
  };

  const onComplete = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'complete', ...data })}\n\n`);
  };

  syncEventEmitter.on("log", onLog);
  syncEventEmitter.on("progress", onProgress);
  syncEventEmitter.on("complete", onComplete);

  req.on("close", () => {
    syncEventEmitter.off("log", onLog);
    syncEventEmitter.off("progress", onProgress);
    syncEventEmitter.off("complete", onComplete);
  });
});

export default router;
