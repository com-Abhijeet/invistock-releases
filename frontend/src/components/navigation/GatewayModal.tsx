import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Stack,
  IconButton,
  alpha,
  useTheme,
  InputBase,
  Chip,
  Paper,
  Button,
} from "@mui/material";
import {
  X,
  Search,
  Compass,
  CornerDownLeft,
  ChevronRight,
  ArrowLeft,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { menuSections } from "../../config/menu";
import { MenuItem, MenuSection } from "../../lib/navigation";

interface GatewayModalProps {
  open: boolean;
  onClose: () => void;
  initialSection?: string | null;
}

export default function GatewayModal({
  open,
  onClose,
  initialSection = null,
}: GatewayModalProps) {
  const theme = useTheme();
  const navigate = useNavigate();

  // Sequential Navigation State:
  // null = Level 1 (Main Gateway Groups list)
  // MenuSection = Level 2 (Items inside selected Group)
  const [selectedGroup, setSelectedGroup] = useState<MenuSection | null>(null);
  // Focused item index in the active list
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize active group on modal open
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setFocusedIndex(0);
      if (initialSection) {
        const found = menuSections.find(
          (s) => s.title.toLowerCase() === initialSection.toLowerCase()
        );
        setSelectedGroup(found || null);
      } else {
        setSelectedGroup(null);
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open, initialSection]);

  // Flattened search items when actively typing in search bar
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { section: string; item: MenuItem }[] = [];
    menuSections.forEach((section) => {
      section.items.forEach((item) => {
        if (
          item.label.toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q) ||
          item.path.toLowerCase().includes(q)
        ) {
          results.push({ section: section.title, item });
        }
      });
    });
    return results;
  }, [searchQuery]);

  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
  useEffect(() => {
    setSearchSelectedIndex(0);
  }, [searchResults]);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  // Keyboard navigation & Tally hotkey listener
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search Mode Key Handling (When text is typed into search bar)
      if (searchQuery.trim()) {
        if (e.key === "Escape") {
          e.preventDefault();
          setSearchQuery("");
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSearchSelectedIndex((prev) =>
            prev + 1 >= searchResults.length ? 0 : prev + 1
          );
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSearchSelectedIndex((prev) =>
            prev <= 0 ? Math.max(0, searchResults.length - 1) : prev - 1
          );
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (searchResults[searchSelectedIndex]) {
            handleNavigate(searchResults[searchSelectedIndex].item.path);
          }
          return;
        }
        return;
      }

      // 2. Sequential Tally Gateway Navigation

      // ESCAPE KEY: Go back to Level 1 or Close Gateway Modal
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (selectedGroup !== null) {
          setSelectedGroup(null);
          setFocusedIndex(0);
        } else {
          onClose();
        }
        return;
      }

      // BACKSPACE or ARROW LEFT: Go back to Level 1 (if currently in Level 2)
      if (e.key === "Backspace" || e.key === "ArrowLeft") {
        if (selectedGroup !== null) {
          e.preventDefault();
          setSelectedGroup(null);
          setFocusedIndex(0);
          return;
        }
      }

      // ARROW DOWN: Navigate down in active list
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const maxLen = selectedGroup
          ? selectedGroup.items.length + 1
          : menuSections.length + 1; // +1 for Quit option
        setFocusedIndex((prev) => (prev + 1 >= maxLen ? 0 : prev + 1));
        return;
      }

      // ARROW UP: Navigate up in active list
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const maxLen = selectedGroup
          ? selectedGroup.items.length + 1
          : menuSections.length + 1;
        setFocusedIndex((prev) => (prev <= 0 ? maxLen - 1 : prev - 1));
        return;
      }

      // ENTER or ARROW RIGHT: Execute selected item / open group
      if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        if (selectedGroup === null) {
          // Level 1: Open selected group or Quit
          if (focusedIndex === menuSections.length) {
            onClose(); // Quit option
          } else if (menuSections[focusedIndex]) {
            setSelectedGroup(menuSections[focusedIndex]);
            setFocusedIndex(0);
          }
        } else {
          // Level 2: Open selected item or Back
          if (focusedIndex === selectedGroup.items.length) {
            setSelectedGroup(null); // Back option
            setFocusedIndex(0);
          } else if (selectedGroup.items[focusedIndex]) {
            handleNavigate(selectedGroup.items[focusedIndex].path);
          }
        }
        return;
      }

      // SINGLE KEY HOTKEY LISTENERS (Single character, no Ctrl/Alt/Meta):
      if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
        const char = e.key.toUpperCase();

        // 'Q' = Quit Gateway or Go Back to Main Menu
        if (char === "Q") {
          e.preventDefault();
          if (selectedGroup !== null) {
            setSelectedGroup(null);
            setFocusedIndex(0);
          } else {
            onClose();
          }
          return;
        }

        if (selectedGroup === null) {
          // --- LEVEL 1 HOTKEYS ---
          // 1. Check if char matches a Group hotkey (e.g., S for Sales Vouchers)
          const matchedGroup = menuSections.find(
            (sec) => sec.hotkey?.toUpperCase() === char
          );
          if (matchedGroup) {
            e.preventDefault();
            setSelectedGroup(matchedGroup);
            setFocusedIndex(0);
            return;
          }

          // 2. Direct Item Jump: Check if char matches an item across all groups
          for (const sec of menuSections) {
            const item = sec.items.find((it) => it.hotkey?.toUpperCase() === char);
            if (item) {
              e.preventDefault();
              handleNavigate(item.path);
              return;
            }
          }
        } else {
          // --- LEVEL 2 HOTKEYS ---
          const matchedItem = selectedGroup.items.find(
            (it) => it.hotkey?.toUpperCase() === char
          );
          if (matchedItem) {
            e.preventDefault();
            handleNavigate(matchedItem.path);
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    searchQuery,
    searchResults,
    searchSelectedIndex,
    selectedGroup,
    focusedIndex,
  ]);

  // Helper to render label with highlighted hotkey letter
  const renderHotkeyLabel = (
    label: string,
    hotkey?: string,
    isHighlighted: boolean = false
  ) => {
    if (!hotkey) return label;
    const hotkeyChar = hotkey.toUpperCase();
    const idx = label.toUpperCase().indexOf(hotkeyChar);

    if (idx === -1) {
      return (
        <Box component="span" sx={{ fontWeight: isHighlighted ? 800 : 600 }}>
          {label}
        </Box>
      );
    }

    const before = label.slice(0, idx);
    const char = label.slice(idx, idx + 1);
    const after = label.slice(idx + 1);

    return (
      <Box component="span" sx={{ fontWeight: isHighlighted ? 800 : 600 }}>
        {before}
        <Box
          component="span"
          sx={{
            color: isHighlighted
              ? "white"
              : theme.palette.mode === "dark"
              ? "#38bdf8"
              : "primary.main",
            fontWeight: 900,
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            textDecorationThickness: "2px",
          }}
        >
          {char}
        </Box>
        {after}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          width: 520,
          maxWidth: "94vw",
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          bgcolor: theme.palette.background.paper,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* --- TOP TALLY HEADER BAR --- */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {selectedGroup ? (
            <IconButton
              size="small"
              onClick={() => {
                setSelectedGroup(null);
                setFocusedIndex(0);
              }}
              sx={{ color: "primary.main", p: 0.5 }}
            >
              <ChevronLeft size={20} />
            </IconButton>
          ) : (
            <Compass size={20} color={theme.palette.primary.main} />
          )}

          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 900,
                letterSpacing: 0.5,
                color: "text.primary",
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: "0.95rem",
              }}
            >
              Gateway of KOSH
              {selectedGroup && (
                <>
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.disabled"
                    sx={{ fontWeight: 700 }}
                  >
                    &rsaquo;
                  </Typography>
                  <Typography
                    component="span"
                    variant="subtitle2"
                    color="primary.main"
                    sx={{ fontWeight: 800 }}
                  >
                    {selectedGroup.title}
                  </Typography>
                </>
              )}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label="Alt + G"
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: "0.65rem",
              bgcolor: alpha(theme.palette.text.primary, 0.06),
              color: "text.secondary",
            }}
          />
          <IconButton size="small" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Stack>
      </Box>

      {/* --- SEARCH / GO TO BAR --- */}
      <Box
        sx={{
          px: 2.5,
          py: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: alpha(theme.palette.action.hover, 0.02),
          flexShrink: 0,
        }}
      >
        <Search size={16} color={theme.palette.text.secondary} />
        <InputBase
          inputRef={searchInputRef}
          fullWidth
          placeholder={
            selectedGroup
              ? `Press item letter inside ${selectedGroup.title} or type page name...`
              : "Press group letter (S, P, I, A, C, W, D...) or type page name..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            fontSize: "0.875rem",
            fontWeight: 500,
            "& input::placeholder": {
              color: "text.disabled",
              opacity: 1,
            },
          }}
        />
        {searchQuery && (
          <IconButton size="small" onClick={() => setSearchQuery("")}>
            <X size={14} />
          </IconButton>
        )}
      </Box>

      {/* --- MAIN SEQUENTIAL MENU CONTENT --- */}
      <DialogContent
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          maxHeight: 460,
          overflowY: "auto",
        }}
      >
        {searchQuery.trim() ? (
          /* --- SEARCH RESULTS VIEW --- */
          <Box>
            {searchResults.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                <Typography variant="body2" fontWeight={600}>
                  No pages matching "{searchQuery}"
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Press Esc to clear search
                </Typography>
              </Box>
            ) : (
              <Stack spacing={0.5}>
                {searchResults.map((r, idx) => {
                  const isSelected = idx === searchSelectedIndex;
                  return (
                    <Box
                      key={idx}
                      onClick={() => handleNavigate(r.item.path)}
                      onMouseEnter={() => setSearchSelectedIndex(idx)}
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: isSelected
                          ? theme.palette.primary.main
                          : "transparent",
                        color: isSelected ? "white" : "text.primary",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: "0.8rem",
                            fontFamily: '"JetBrains Mono", monospace',
                            color: isSelected
                              ? theme.palette.primary.main
                              : theme.palette.primary.main,
                            bgcolor: isSelected
                              ? "white"
                              : alpha(theme.palette.primary.main, 0.12),
                          }}
                        >
                          {r.item.hotkey || "•"}
                        </Box>
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight={isSelected ? 800 : 600}
                          >
                            {r.item.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              opacity: isSelected ? 0.85 : 0.6,
                              fontSize: "0.72rem",
                            }}
                          >
                            {r.section}
                          </Typography>
                        </Box>
                      </Stack>
                      {isSelected && (
                        <Chip
                          icon={<CornerDownLeft size={10} color="white" />}
                          label="Enter"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.6rem",
                            fontWeight: 800,
                            bgcolor: "rgba(255,255,255,0.25)",
                            color: "white",
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        ) : selectedGroup === null ? (
          /* --- LEVEL 1: MAIN GATEWAY GROUPS VIEW --- */
          <Box>
            {/* Tally Card Box Frame */}
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                borderColor: theme.palette.divider,
                bgcolor: alpha(theme.palette.background.paper, 0.8),
              }}
            >
              {/* Tally Box Title Banner */}
              <Box
                sx={{
                  px: 2,
                  py: 0.75,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 1,
                    color: "primary.main",
                    textTransform: "uppercase",
                  }}
                >
                  GATEWAY OF KOSH — MAIN MENU
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Press hotkey letter
                </Typography>
              </Box>

              {/* Group Items List */}
              <Stack spacing={0.25} sx={{ p: 0.75 }}>
                {menuSections.map((sec, idx) => {
                  const isSelected = idx === focusedIndex;

                  return (
                    <Box
                      key={sec.title}
                      onClick={() => {
                        setSelectedGroup(sec);
                        setFocusedIndex(0);
                      }}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      sx={{
                        px: 1.5,
                        py: 0.9,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: isSelected
                          ? theme.palette.primary.main
                          : "transparent",
                        color: isSelected ? "white" : "text.primary",
                        transition: "all 0.1s ease",
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: "0.8rem",
                            fontFamily: '"JetBrains Mono", monospace',
                            color: isSelected
                              ? theme.palette.primary.main
                              : theme.palette.primary.main,
                            bgcolor: isSelected
                              ? "white"
                              : alpha(theme.palette.primary.main, 0.12),
                          }}
                        >
                          {sec.hotkey}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: "0.875rem",
                          }}
                        >
                          {renderHotkeyLabel(
                            sec.title,
                            sec.hotkey,
                            isSelected
                          )}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={`${sec.items.length}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            bgcolor: isSelected
                              ? "rgba(255, 255, 255, 0.2)"
                              : alpha(theme.palette.text.primary, 0.06),
                            color: isSelected ? "white" : "text.secondary",
                          }}
                        />
                        <ChevronRight
                          size={15}
                          color={isSelected ? "white" : theme.palette.text.disabled}
                        />
                      </Stack>
                    </Box>
                  );
                })}

                {/* Quit Option at bottom */}
                <Box
                  onClick={onClose}
                  onMouseEnter={() => setFocusedIndex(menuSections.length)}
                  sx={{
                    px: 1.5,
                    py: 0.9,
                    mt: 0.5,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: focusedIndex === menuSections.length
                      ? theme.palette.error.main
                      : alpha(theme.palette.error.main, 0.04),
                    color: focusedIndex === menuSections.length ? "white" : "error.main",
                    transition: "all 0.1s ease",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "0.8rem",
                        fontFamily: '"JetBrains Mono", monospace',
                        color: focusedIndex === menuSections.length
                          ? theme.palette.error.main
                          : "white",
                        bgcolor: focusedIndex === menuSections.length
                          ? "white"
                          : theme.palette.error.main,
                      }}
                    >
                      Q
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      <Box
                        component="span"
                        sx={{
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                          fontWeight: 900,
                        }}
                      >
                        Q
                      </Box>
                      uit Gateway
                    </Typography>
                  </Stack>
                  <Chip
                    label="Esc"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      bgcolor: focusedIndex === menuSections.length
                        ? "rgba(255,255,255,0.2)"
                        : alpha(theme.palette.error.main, 0.1),
                      color: focusedIndex === menuSections.length
                        ? "white"
                        : "error.main",
                    }}
                  />
                </Box>
              </Stack>
            </Paper>
          </Box>
        ) : (
          /* --- LEVEL 2: SELECTED GROUP ITEMS VIEW --- */
          <Box>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                borderColor: theme.palette.divider,
                bgcolor: alpha(theme.palette.background.paper, 0.8),
              }}
            >
              {/* Sub-Group Header Banner */}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedGroup(null);
                      setFocusedIndex(0);
                    }}
                    startIcon={<ArrowLeft size={14} />}
                    sx={{
                      textTransform: "none",
                      fontWeight: 800,
                      py: 0.2,
                      px: 1,
                      minWidth: "auto",
                      borderRadius: 1,
                    }}
                  >
                    Main Menu
                  </Button>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 900,
                      letterSpacing: 1,
                      color: "primary.main",
                      textTransform: "uppercase",
                    }}
                  >
                    &bull; {selectedGroup.title}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Press hotkey letter
                </Typography>
              </Box>

              {/* Group Sub-Items List */}
              <Stack spacing={0.25} sx={{ p: 0.75 }}>
                {selectedGroup.items.map((item, idx) => {
                  const isSelected = idx === focusedIndex;

                  return (
                    <Box
                      key={item.label}
                      onClick={() => handleNavigate(item.path)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      sx={{
                        px: 1.5,
                        py: 0.9,
                        borderRadius: 1.5,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: isSelected
                          ? theme.palette.primary.main
                          : "transparent",
                        color: isSelected ? "white" : "text.primary",
                        transition: "all 0.1s ease",
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: "0.8rem",
                            fontFamily: '"JetBrains Mono", monospace',
                            color: isSelected
                              ? theme.palette.primary.main
                              : theme.palette.primary.main,
                            bgcolor: isSelected
                              ? "white"
                              : alpha(theme.palette.primary.main, 0.12),
                          }}
                        >
                          {item.hotkey}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: "0.875rem",
                          }}
                        >
                          {renderHotkeyLabel(
                            item.label,
                            item.hotkey,
                            isSelected
                          )}
                        </Typography>
                      </Stack>

                      {isSelected && (
                        <Chip
                          icon={<CornerDownLeft size={10} color="white" />}
                          label="Enter"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.6rem",
                            fontWeight: 800,
                            bgcolor: "rgba(255,255,255,0.25)",
                            color: "white",
                          }}
                        />
                      )}
                    </Box>
                  );
                })}

                {/* Back / Quit option */}
                <Box
                  onClick={() => {
                    setSelectedGroup(null);
                    setFocusedIndex(0);
                  }}
                  onMouseEnter={() => setFocusedIndex(selectedGroup.items.length)}
                  sx={{
                    px: 1.5,
                    py: 0.9,
                    mt: 0.5,
                    borderRadius: 1.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: focusedIndex === selectedGroup.items.length
                      ? theme.palette.primary.main
                      : alpha(theme.palette.action.hover, 0.05),
                    color: focusedIndex === selectedGroup.items.length
                      ? "white"
                      : "text.secondary",
                    transition: "all 0.1s ease",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "0.8rem",
                        fontFamily: '"JetBrains Mono", monospace',
                        color: focusedIndex === selectedGroup.items.length
                          ? theme.palette.primary.main
                          : "text.secondary",
                        bgcolor: focusedIndex === selectedGroup.items.length
                          ? "white"
                          : alpha(theme.palette.text.primary, 0.08),
                      }}
                    >
                      Q
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      <Box
                        component="span"
                        sx={{
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                          fontWeight: 900,
                        }}
                      >
                        Q
                      </Box>
                      uit / Back to Main Menu
                    </Typography>
                  </Stack>
                  <Chip
                    label="Esc"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      bgcolor: focusedIndex === selectedGroup.items.length
                        ? "rgba(255,255,255,0.2)"
                        : alpha(theme.palette.text.primary, 0.08),
                      color: focusedIndex === selectedGroup.items.length
                        ? "white"
                        : "text.secondary",
                    }}
                  />
                </Box>
              </Stack>
            </Paper>
          </Box>
        )}
      </DialogContent>

      {/* --- BOTTOM SHORTCUT HELP FOOTER --- */}
      <Box
        sx={{
          px: 2.5,
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.action.hover, 0.03),
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {selectedGroup
            ? "Press Hotkey letter to open page • Esc/Backspace to go back • Q to Quit"
            : "Press Hotkey letter (e.g. S, P, I, A, C) to open Group • Esc to Close"}
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontWeight: 800, fontSize: "0.68rem" }}
        >
          KOSH Tally Gateway
        </Typography>
      </Box>
    </Dialog>
  );
}
