"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  Typography,
  AppBar,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  CSSObject,
  Theme,
  Collapse,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  User,
  Settings,
  ArrowLeft,
  Menu as MenuIcon, // Alias to avoid conflict with MUI Menu
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  LogOut,
  HelpCircle, // Icon for help
  Tag, // Icon for Label Info
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import LowStockNotification from "./layout/LowStockNotification";
import OverduePaymentsNotification from "./layout/OverduePaymentsNotification";
import { getShopData } from "../lib/api/shopService";
import { ShopSetupForm } from "../lib/types/shopTypes";
import { useAuth } from "../context/AuthContext";
import GlobalSearch from "./GlobalSearch";
import KeyboardShortcutsModal from "./KeyboardShortcutModal";
import LabelInfoModal from "./inventory/LabelInfoModal";

import theme from "../../theme";
import { menuSections } from "../config/menu";

const drawerWidth = 260;
const collapsedDrawerWidth = 72;

const SidebarNav = ({
  isCollapsed,
  onCollapseToggle,
}: {
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}) => {
  const location = useLocation();

  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    const activeSection = menuSections.find((section) =>
      section.items.some((item) => item.path === location.pathname)
    );
    if (activeSection) {
      setOpenSection(activeSection.title);
    }
  }, [location.pathname]);

  const handleToggleSection = (title: string) => {
    setOpenSection((prev) => (prev === title ? null : title));
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: theme.palette.background.default, // Soft Grey
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Sidebar Header / Toggle */}
      <Box
        sx={{
          py: 1,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          minHeight: 64, // Match AppBar height
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {!isCollapsed && (
          <Typography
            variant="h6"
            fontWeight={800}
            color="primary.main"
            sx={{ letterSpacing: "-0.5px" }}
          >
            KOSH
          </Typography>
        )}
        <IconButton
          onClick={onCollapseToggle}
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": { color: theme.palette.primary.main },
          }}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </IconButton>
      </Box>

      {/* Scrollable Menu Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          overflowX: "hidden",
          p: 1,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: theme.palette.grey[300],
            borderRadius: "4px",
          },
        }}
      >
        {menuSections.map((section, index) => {
          const isOpen = isCollapsed || openSection === section.title;
          const hasActiveChild = section.items.some(
            (item) => item.path === location.pathname
          );

          return (
            <Box key={index} mb={0.5}>
              {!isCollapsed && (
                <ListItemButton
                  onClick={() => handleToggleSection(section.title)}
                  sx={{
                    py: 0.75,
                    px: 1.5,
                    mt: 1,
                    mb: 0.5,
                    borderRadius: "6px",
                    "&:hover": { backgroundColor: "transparent" },
                  }}
                >
                  <ListItemText
                    primary={section.title.toUpperCase()}
                    primaryTypographyProps={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: hasActiveChild
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary,
                      letterSpacing: "0.8px",
                    }}
                  />
                  <Box
                    sx={{
                      color: theme.palette.text.disabled,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      display: "flex",
                    }}
                  >
                    <ChevronDown size={14} />
                  </Box>
                </ListItemButton>
              )}

              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {section.items.map((item) => {
                    const selected = location.pathname === item.path;
                    return (
                      <ListItem
                        key={item.label}
                        disablePadding
                        sx={{ display: "block", mb: 0.25 }}
                      >
                        <Tooltip
                          title={isCollapsed ? item.label : ""}
                          placement="right"
                          arrow
                        >
                          <ListItemButton
                            component={Link}
                            to={item.path}
                            selected={selected}
                            sx={{
                              minHeight: 40,
                              justifyContent: isCollapsed
                                ? "center"
                                : "initial",
                              px: 2,
                              mx: 0.5,
                              borderRadius: "6px",
                              color: selected
                                ? theme.palette.primary.main
                                : theme.palette.text.primary,
                              backgroundColor: selected
                                ? theme.palette.action.selected
                                : "transparent",
                              position: "relative",
                              overflow: "hidden",
                              transition: "all 0.2s ease-in-out",
                              // Active Indicator
                              "&::before": selected
                                ? {
                                    content: '""',
                                    position: "absolute",
                                    left: 0,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    height: "60%",
                                    width: "4px",
                                    backgroundColor: theme.palette.primary.main,
                                    borderTopRightRadius: "4px",
                                    borderBottomRightRadius: "4px",
                                  }
                                : {},
                              "&:hover": {
                                backgroundColor: selected
                                  ? theme.palette.action.selected
                                  : theme.palette.action.hover,
                                color: theme.palette.primary.main,
                                "& .MuiListItemIcon-root": {
                                  color: theme.palette.primary.main,
                                },
                              },
                            }}
                          >
                            <ListItemIcon
                              sx={{
                                minWidth: 0,
                                mr: isCollapsed ? 0 : 1.5,
                                justifyContent: "center",
                                color: selected
                                  ? theme.palette.primary.main
                                  : theme.palette.text.secondary,
                                transition: "color 0.2s",
                              }}
                            >
                              {item.icon}
                            </ListItemIcon>
                            {!isCollapsed && (
                              <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                  fontSize: "0.875rem",
                                  fontWeight: selected ? 600 : 400,
                                }}
                              />
                            )}
                          </ListItemButton>
                        </Tooltip>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default function SidebarLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [_shop, setShop] = useState<ShopSetupForm | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isFocusLocked, setIsFocusLocked] = useState(false);

  // Shortcuts Modal
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Label Info Modal
  const [labelInfoOpen, setLabelInfoOpen] = useState(false);

  // Profile Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    getShopData().then(setShop);
  }, []);

  // Shortcut Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Help Shortcut (Shift + ?)
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // 2. Check for Ctrl+Alt+F (Toggle Locked Mode)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (isFocusLocked) {
          setIsFocusLocked(false);
          setIsFocusMode(false);
          toast.success("Focus Mode Unlocked");
        } else {
          setIsFocusMode(true);
          setIsFocusLocked(true);
          toast.success("Focus Mode Locked");
        }
        return;
      }

      // 3. Check for Ctrl+F (Toggle Mode if NOT locked)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "f" &&
        !e.altKey
      ) {
        e.preventDefault();
        if (isFocusLocked) {
          toast.error("Focus mode is locked. Press Ctrl + Alt + F to exit.");
          return;
        }
        setIsFocusMode((prev) => !prev);
      }

      // 4. Allow Escape to exit focus mode (if NOT locked)
      if (e.key === "Escape" && isFocusMode) {
        if (isFocusLocked) {
          toast.error("Focus mode is locked. Press Ctrl + Alt + F to exit.");
          return;
        }
        setIsFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode, isFocusLocked]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleCollapseToggle = () => setIsCollapsed(!isCollapsed);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileClose();
    await logout();
  };

  const handleSettingsClick = () => {
    handleProfileClose();
    navigate("/settings");
  };

  const handleFocusExitClick = () => {
    if (isFocusLocked) {
      toast.error("Focus mode is locked. Press Ctrl + Alt + F to exit.");
      return;
    }
    setIsFocusMode(false);
  };

  const openedMixin = (theme: Theme): CSSObject => ({
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
  });

  const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: "hidden",
    width: collapsedDrawerWidth,
  });

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Sidebar - HIDDEN IN FOCUS MODE */}
      {!isFocusMode && (
        <Box
          component="nav"
          sx={{
            width: { sm: isCollapsed ? collapsedDrawerWidth : drawerWidth },
            flexShrink: { sm: 0 },
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: "block", sm: "none" },
              "& .MuiDrawer-paper": {
                width: drawerWidth,
                backgroundColor: theme.palette.background.default,
              },
            }}
          >
            <SidebarNav
              isCollapsed={false}
              onCollapseToggle={handleDrawerToggle}
            />
          </Drawer>

          <Drawer
            variant="permanent"
            open={!isCollapsed}
            sx={{
              display: { xs: "none", sm: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                whiteSpace: "nowrap",
                borderRight: "none", // Handled by SidebarNav container
                backgroundColor: theme.palette.background.default,
                ...(isCollapsed ? closedMixin(theme) : openedMixin(theme)),
              },
            }}
          >
            <SidebarNav
              isCollapsed={isCollapsed}
              onCollapseToggle={handleCollapseToggle}
            />
          </Drawer>
        </Box>
      )}

      {/* MAIN LAYOUT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* AppBar - HIDDEN IN FOCUS MODE */}
        {!isFocusMode && (
          <AppBar
            position="static"
            elevation={0}
            sx={{
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              borderBottom: `1px solid ${theme.palette.divider}`,
              zIndex: theme.zIndex.drawer + 1,
            }}
          >
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: "none" } }}
              >
                <MenuIcon />
              </IconButton>

              {/* Back Button */}
              <Tooltip title="Go Back">
                <IconButton
                  onClick={() => navigate(-1)}
                  sx={{
                    mr: 2,
                    color: theme.palette.text.secondary,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  <ArrowLeft size={20} />
                </IconButton>
              </Tooltip>

              {/* ✅ GLOBAL SEARCH COMPONENT */}
              <Box
                sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}
              >
                <GlobalSearch />
              </Box>

              <Stack direction="row" alignItems="center" spacing={1}>
                {/* Help Shortcut Icon */}
                <Tooltip title="Keyboard Shortcuts (?)">
                  <IconButton
                    size="small"
                    onClick={() => setShortcutsOpen(true)}
                    sx={{ color: "text.secondary" }}
                  >
                    <HelpCircle size={20} />
                  </IconButton>
                </Tooltip>

                {/* Label Info Icon */}
                <Tooltip title="Label & Price Decoder">
                  <IconButton
                    size="small"
                    onClick={() => setLabelInfoOpen(true)}
                    sx={{ color: "text.secondary" }}
                  >
                    <Tag size={20} />
                  </IconButton>
                </Tooltip>

                <LowStockNotification />
                <OverduePaymentsNotification />

                {/* --- User Profile Dropdown --- */}
                {user && (
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{ mr: 1, display: { xs: "none", sm: "block" } }}
                  >
                    {user.name}
                  </Typography>
                )}

                <Tooltip title="Account Settings">
                  <IconButton
                    onClick={handleProfileClick}
                    size="small"
                    sx={{ ml: 1 }}
                    aria-controls={openMenu ? "account-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={openMenu ? "true" : undefined}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={18} />
                    </Box>
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={anchorEl}
                  id="account-menu"
                  open={openMenu}
                  onClose={handleProfileClose}
                  onClick={handleProfileClose}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      overflow: "visible",
                      filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                      mt: 1.5,
                      minWidth: 150,
                      "& .MuiAvatar-root": {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      "&:before": {
                        content: '""',
                        display: "block",
                        position: "absolute",
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: "background.paper",
                        transform: "translateY(-50%) rotate(45deg)",
                        zIndex: 0,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                  <MenuItem onClick={handleSettingsClick}>
                    <ListItemIcon>
                      <Settings size={18} />
                    </ListItemIcon>
                    Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                    <ListItemIcon>
                      <LogOut size={18} color={theme.palette.error.main} />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </Stack>
            </Toolbar>
          </AppBar>
        )}

        {/* Focus Mode Exit Button - VISIBLE ONLY IN FOCUS MODE */}
        {isFocusMode && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 1200,
            }}
          >
            <Tooltip
              title={
                isFocusLocked
                  ? "Focus Locked (Ctrl+Alt+F)"
                  : "Exit Focus Mode (Esc)"
              }
            >
              <IconButton
                onClick={handleFocusExitClick}
                sx={{
                  bgcolor: theme.palette.background.paper,
                  boxShadow: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  "&:hover": {
                    bgcolor: theme.palette.action.hover,
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.2s",
                }}
              >
                {isFocusLocked ? (
                  <Lock size={20} color={theme.palette.error.main} />
                ) : (
                  <ArrowLeft size={20} color={theme.palette.text.primary} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            p: 0,
            bgcolor: theme.palette.background.paper, // Main Content White
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Label Info Modal */}
      <LabelInfoModal
        open={labelInfoOpen}
        onClose={() => setLabelInfoOpen(false)}
      />
    </Box>
  );
}
