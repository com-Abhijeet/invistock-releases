import { createContext, useContext, useState, useRef, ReactNode } from "react";
import { api } from "../lib/api/api";

interface TallySyncContextType {
  syncing: boolean;
  logs: string[];
  startSync: (syncType: string, startDate?: string, endDate?: string) => void;
  clearLogs: () => void;
}

const TallySyncContext = createContext<TallySyncContextType | undefined>(
  undefined,
);

export const TallySyncProvider = ({ children }: { children: ReactNode }) => {
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startSync = (
    syncType: string,
    startDate?: string,
    endDate?: string,
  ) => {
    if (syncing) return;

    setSyncing(true);
    setLogs((prev) => [...prev, `[SYSTEM] Starting ${syncType} sync...`]);

    let url = `${api.defaults.baseURL}/api/tally/sse?type=${syncType}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "done") {
        setLogs((prev) => [...prev, `[SYSTEM] Sync Completed.`]);
        setSyncing(false);
        eventSource.close();
        eventSourceRef.current = null;
      } else if (data.type === "error") {
        setLogs((prev) => [...prev, `[ERROR] ${data.message}`]);
      } else if (data.type === "success") {
        setLogs((prev) => [...prev, `[SUCCESS] ${data.message}`]);
      } else {
        setLogs((prev) => [...prev, `[INFO] ${data.message}`]);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      setLogs((prev) => [
        ...prev,
        `[SYSTEM ERROR] Connection lost or interrupted.`,
      ]);
      setSyncing(false);
      eventSource.close();
      eventSourceRef.current = null;
    };
  };

  const clearLogs = () => {
    if (!syncing) {
      setLogs([]);
    }
  };

  return (
    <TallySyncContext.Provider value={{ syncing, logs, startSync, clearLogs }}>
      {children}
    </TallySyncContext.Provider>
  );
};

export const useTallySync = () => {
  const context = useContext(TallySyncContext);
  if (context === undefined) {
    throw new Error("useTallySync must be used within a TallySyncProvider");
  }
  return context;
};
