import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Chip,
  IconButton,
} from "@mui/material";
import { X } from "lucide-react";
import Grid from "@mui/material/GridLegacy";
import { menuSections } from "../config/menu"; // Ensure path is correct

interface ShortcutGroup {
  category: string;
  shortcuts: { keys: string[]; description: string }[];
}

// 1. Static General Shortcuts
const GENERAL_SHORTCUTS: ShortcutGroup = {
  category: "General",
  shortcuts: [
    { keys: ["Alt", "G"], description: "Gateway of KOSH (Tally Go To)" },
    { keys: ["Ctrl", "G"], description: "Gateway of KOSH (Tally Go To)" },
    { keys: ["G"], description: "Open Gateway (from Home screen)" },
    { keys: ["Ctrl", "K"], description: "Global Search" },
    { keys: ["Shift", "?"], description: "Show Keyboard Shortcuts" },
    { keys: ["Esc"], description: "Close Modals / Exit Gateway" },
    { keys: ["Ctrl", "F"], description: "Toggle Focus Mode" },
    { keys: ["Ctrl", "Alt", "F"], description: "Lock Focus Mode" },
    { keys: ["Alt", "C"], description: "Toggle GST/Non-GST Mode" },
    { keys: ["Alt", "P"], description: "Toggle Product Overview In Sales" },
  ],
};

// 2. Dynamic Navigation Shortcuts (from menu.tsx)
const NAVIGATION_SHORTCUTS: ShortcutGroup = {
  category: "Gateway Quick Nav (Tally Mode)",
  shortcuts: [],
};

// Populate Navigation Shortcuts from menuSections
menuSections.forEach((section) => {
  section.items.forEach((item) => {
    if (item.hotkey && section.hotkey) {
      NAVIGATION_SHORTCUTS.shortcuts.push({
        keys: [section.hotkey, item.hotkey],
        description: `${item.label} (${section.title})`,
      });
    }
  });
});

const ALL_SHORTCUTS = [GENERAL_SHORTCUTS, NAVIGATION_SHORTCUTS];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Keyboard Shortcuts
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {ALL_SHORTCUTS.map((group) => (
            <Grid item xs={12} key={group.category}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight="bold"
                gutterBottom
                sx={{
                  textTransform: "uppercase",
                  fontSize: "0.75rem",
                  letterSpacing: 1,
                }}
              >
                {group.category}
              </Typography>
              <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0 }}>
                {group.shortcuts.map((shortcut) => (
                  <Box
                    component="li"
                    key={shortcut.description}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2">
                      {shortcut.description}
                    </Typography>
                    <Box display="flex" gap={0.5}>
                      {shortcut.keys.map((key) => (
                        <Chip
                          key={key}
                          label={key}
                          size="small"
                          sx={{
                            borderRadius: 1,
                            fontWeight: "bold",
                            fontFamily: "monospace",
                            height: 24,
                            minWidth: 24,
                            bgcolor: "action.selected",
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
