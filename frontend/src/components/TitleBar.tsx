import { Box, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import CropSquareRoundedIcon from "@mui/icons-material/CropSquareRounded";
import { useState } from "react";
import toast from "react-hot-toast";

const TitleBar = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleMinimize = () => window.electron?.minimizeApp();
  const handleMaximize = () => window.electron?.maximizeApp();
  
  const handleCloseClick = () => {
    setShowPrompt(true);
  };

  const executeClose = () => {
    setShowPrompt(false);
    window.electron?.closeApp();
  };

  const handleBackupAndClose = async () => {
    if (!window.electron?.ipcRenderer) {
      executeClose();
      return;
    }
    
    setIsClosing(true);
    toast.loading("Waiting for manual backup...");
    try {
      const result = await window.electron.ipcRenderer.invoke("backup-database");
      toast.dismiss();
      if (result.success) {
        toast.success(result.message);
      } else if (result.message && !result.message.includes("cancelled")) {
        toast.error(result.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Backup failed");
    } finally {
      setIsClosing(false);
      executeClose();
    }
  };

  return (
    <>
      <Dialog open={showPrompt} onClose={isClosing ? undefined : executeClose}>
        <DialogTitle>Manual Backup</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Would you like to create a manual backup before exiting? 
            <br/><br/>
            Automated backups (Google Drive & Local Folder) have already run if configured.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={executeClose} color="inherit" disabled={isClosing}>
            No, just exit
          </Button>
          <Button onClick={handleBackupAndClose} variant="contained" color="primary" disabled={isClosing}>
            Yes, create backup
          </Button>
        </DialogActions>
      </Dialog>
      <Box
      sx={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 9999,
        // ✅ 1. ULTRA THIN TRIGGER ZONE
        // Reduced to 6px (matching "1px-2px near help bar").
        // Width reduced to 100px to only catch the corner area.
        height: "6px",
        width: "100px",
        padding: 0,

        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-start",

        // This catches the mouse at the top edge
        pointerEvents: "auto",

        // ✅ HOVER LOGIC
        "&:hover .glass-controls": {
          opacity: 1,
          transform: "translateY(0) scale(1)",
          pointerEvents: "auto",
        },

        // Hide hint on hover
        "&:hover .discovery-hint": {
          opacity: 0,
          transform: "translateY(-10px)",
        },
      }}
    >
      {/* ✅ DISCOVERY HINT (RED) */}
      <Box
        className="discovery-hint"
        sx={{
          position: "absolute",
          top: "1px", // Centered in the 6px zone
          right: "24px",
          width: "40px",
          height: "4px",
          borderRadius: "4px",
          backgroundColor: "rgba(255, 50, 50, 0.8)",
          backdropFilter: "blur(4px)",
          boxShadow: "0 0 8px rgba(255, 0, 0, 0.4)",
          zIndex: 1,
          transition: "all 0.5s ease",
          animation: "pulse 3s infinite ease-in-out",
          pointerEvents: "none",
          "@keyframes pulse": {
            "0%": { opacity: 0.4 },
            "50%": { opacity: 1, boxShadow: "0 0 10px rgba(255, 50, 50, 0.8)" },
            "100%": { opacity: 0.4 },
          },
        }}
      />

      {/* Black Glass Pill */}
      <Box
        className="glass-controls"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          padding: "8px 24px",
          borderRadius: "30px",

          // ✅ VISUAL OFFSET
          // Connects immediately to the 6px trigger zone
          marginTop: "6px",
          marginRight: "16px",

          backgroundColor: "rgba(10, 10, 10, 0.85)",
          backdropFilter: "blur(16px) saturate(180%)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.1)",

          // Animation
          opacity: 0,
          transform: "translateY(-15px) scale(0.9)",
          transition: "all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",

          pointerEvents: "auto",
          WebkitAppRegion: "no-drag",
          zIndex: 2,
        }}
      >
        <IconButton size="small" onClick={handleMinimize} sx={glassBtnStyle}>
          <RemoveRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <IconButton size="small" onClick={handleMaximize} sx={glassBtnStyle}>
          <CropSquareRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <IconButton
          size="small"
          onClick={handleCloseClick}
          sx={{
            ...glassBtnStyle,
            "&:hover": {
              backgroundColor: "#ff4d4d",
              color: "white",
              transform: "scale(1.1) rotate(90deg)",
            },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
    </>
  );
};

const glassBtnStyle = {
  width: 32,
  height: 32,
  color: "rgba(255, 255, 255, 0.9)",
  borderRadius: "50%",
  transition: "all 0.2s ease-out",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    transform: "scale(1.1)",
  },
};

export default TitleBar;
