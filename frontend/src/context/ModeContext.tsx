import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type AppMode = "gst" | "non-gst";

interface ModeContextType {
  mode: AppMode;
  toggleAppMode: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppMode>("gst");
  const navigate = useNavigate();

  const toggleAppMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === "gst" ? "non-gst" : "gst";

      // Navigate to the correct "home" page for the new mode
      if (newMode === "gst") {
        navigate("/");
      } else {
        navigate("/cash-sale");
      }
      return newMode;
    });
  };

  // useMemo prevents unnecessary re-renders of child components
  const value = useMemo(() => ({ mode, toggleAppMode }), [mode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

// Custom hook to easily access the context
export const useAppMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within a ModeProvider");
  }
  return context;
};
