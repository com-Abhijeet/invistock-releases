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
  Divider,
  AppBar,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  CSSObject,
  Theme,
  Collapse, // ✅ Import Collapse for animation
} from "@mui/material";
import {
  LayoutDashboard,
  Boxes,
  Printer,
  ReceiptText,
  Store,
  User,
  Settings,
  FileText,
  SquareStack,
  BadgePercent,
  IndianRupee,
  ArrowLeft,
  Notebook,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LowStockNotification from "./layout/LowStockNotification";
import OverduePaymentsNotification from "./layout/OverduePaymentsNotification";
import { getShopData } from "../lib/api/shopService";
import { ShopSetupForm } from "../lib/types/shopTypes";

const drawerWidth = 250; // Slightly wider to fit headers comfortably
const collapsedDrawerWidth = 72;

const menuSections = [
  {
    title: "Analytics & Reports",
    items: [
      {
        label: "Business Dashboard",
        icon: <LayoutDashboard size={20} />,
        path: "/dashboard",
      },
    ],
  },
  {
    title: "Sales & Billing",
    items: [
      {
        label: "Point of Sale",
        icon: <BadgePercent size={20} />,
        path: "/billing",
      },
      {
        label: "Sales Analytics",
        icon: <ReceiptText size={20} />,
        path: "/sales",
      },
    ],
  },
  {
    title: "Purchasing & Vendors",
    items: [
      {
        label: "Purchase Orders",
        icon: <FileText size={20} />,
        path: "/purchase",
      },
      {
        label: "Purchase Analytics",
        icon: <Boxes size={20} />,
        path: "/purchase-dashboard",
      },
      { label: "Suppliers", icon: <Store size={20} />, path: "/suppliers" },
    ],
  },
  {
    title: "Inventory & Products",
    items: [
      {
        label: "Inventory Overview",
        icon: <Printer size={20} />,
        path: "/inventory",
      },
      {
        label: "Product Catalog",
        icon: <Boxes size={20} />,
        path: "/products",
      },
      {
        label: "Stock Adjustments",
        icon: <Boxes size={20} />,
        path: "/adjustments",
      },
      {
        label: "Categories",
        icon: <SquareStack size={20} />,
        path: "/categories",
      },
    ],
  },
  {
    title: "Payments & Transactions",
    items: [
      {
        label: "Payments",
        icon: <IndianRupee size={20} />,
        path: "/transactions",
      },
      { label: "Expenses", icon: <FileText size={20} />, path: "/expenses" },
    ],
  },
  {
    title: "CRM & Customers",
    items: [
      {
        label: "Customer Directory",
        icon: <User size={20} />,
        path: "/customers",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      { label: "GST Reports", icon: <Notebook size={20} />, path: "/gst" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Preferences", icon: <Settings size={20} />, path: "/settings" },
    ],
  },
];

const SidebarNav = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  // ✅ State to track which section is currently open
  const [openSection, setOpenSection] = useState<string | null>(null);

  // ✅ Effect: Auto-expand the section that contains the active route
  useEffect(() => {
    const activeSection = menuSections.find((section) =>
      section.items.some((item) => item.path === location.pathname)
    );
    if (activeSection) {
      setOpenSection(activeSection.title);
    }
  }, [location.pathname]);

  const handleToggleSection = (title: string) => {
    // Toggle: Close if open, Open if closed (Exclusive mode)
    setOpenSection((prev) => (prev === title ? null : title));
  };

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": {
          background: theme.palette.grey[300],
          borderRadius: "4px",
        },
      }}
    >
      {/* Back Button */}
      <Box sx={{ p: 1, mb: 0 }}>
        <ListItem disablePadding>
          <Tooltip
            title="Go Back"
            placement="right"
            disableHoverListener={!isCollapsed}
          >
            <ListItemButton
              onClick={() => navigate(-1)}
              sx={{
                minHeight: 44,
                justifyContent: isCollapsed ? "center" : "initial",
                px: 2.5,
                borderRadius: "8px",
                color: theme.palette.text.secondary,
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  color: theme.palette.primary.main,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isCollapsed ? 0 : 2,
                  justifyContent: "center",
                  color: "inherit",
                }}
              >
                <ArrowLeft size={20} />
              </ListItemIcon>
              <ListItemText
                primary="Back"
                sx={{ opacity: isCollapsed ? 0 : 1, whiteSpace: "nowrap" }}
              />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </Box>
      <Divider />

      {/* Menu Sections */}
      {menuSections.map((section, index) => {
        // In collapsed (thin) mode, we force all items to show flat (no accordion)
        // In expanded mode, we use the accordion logic
        const isOpen = isCollapsed || openSection === section.title;

        return (
          <Box key={index}>
            {/* ✅ Section Header (Only clickable in expanded mode) */}
            {!isCollapsed && (
              <ListItemButton
                onClick={() => handleToggleSection(section.title)}
                sx={{
                  py: 1,
                  px: 3,
                  mt: 1,
                  borderRadius: "8px",
                  mx: 1,
                  "&:hover": { backgroundColor: "transparent" }, // No hover effect on header
                }}
              >
                <ListItemText
                  primary={section.title.toUpperCase()}
                  primaryTypographyProps={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: theme.palette.text.secondary,
                    letterSpacing: "0.5px",
                  }}
                />
                {/* Chevron Icon */}
                <Box
                  sx={{
                    color: theme.palette.text.disabled,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    display: "flex",
                  }}
                >
                  <ChevronDown size={16} />
                </Box>
              </ListItemButton>
            )}

            {/* ✅ Collapsible Content */}
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {section.items.map((item) => {
                  const selected = location.pathname === item.path;
                  return (
                    <ListItem
                      key={item.label}
                      disablePadding
                      sx={{ display: "block", mb: 0.5 }}
                    >
                      <Tooltip
                        title={isCollapsed ? item.label : ""}
                        placement="right"
                      >
                        <ListItemButton
                          component={Link}
                          to={item.path}
                          selected={selected}
                          sx={{
                            minHeight: 44,
                            justifyContent: isCollapsed ? "center" : "initial",
                            px: 2.5,
                            mx: 1,
                            borderRadius: "8px",
                            color: selected
                              ? theme.palette.secondary.contrastText
                              : theme.palette.text.primary,
                            backgroundColor: selected
                              ? theme.palette.secondary.main
                              : "transparent",
                            "&.Mui-selected": {
                              backgroundColor: theme.palette.secondary.main,
                              color: theme.palette.secondary.contrastText,
                              "&:hover": {
                                backgroundColor: theme.palette.secondary.dark,
                              },
                            },
                            "&:hover": {
                              backgroundColor: selected
                                ? theme.palette.secondary.dark
                                : theme.palette.action.hover,
                              color: selected
                                ? theme.palette.secondary.contrastText
                                : theme.palette.primary.main,
                              "& .MuiListItemIcon-root": {
                                color: selected
                                  ? theme.palette.secondary.contrastText
                                  : theme.palette.primary.main,
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 0,
                              mr: isCollapsed ? 0 : 2,
                              justifyContent: "center",
                              color: selected
                                ? "inherit"
                                : theme.palette.text.secondary,
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

            {/* Divider logic for collapsed mode or visual separation */}
            {/* {index < menuSections.length - 1 && isCollapsed && (
              <Divider sx={{ my: 1 }} />
            )} */}
          </Box>
        );
      })}
    </Box>
  );
};

export default function SidebarLayout({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopSetupForm | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    getShopData().then(setShop);
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleCollapseToggle = () => setIsCollapsed(!isCollapsed);

  // Mixins for smooth transition
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
        bgcolor: "grey.50",
      }}
    >
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
            "& .MuiDrawer-paper": { width: drawerWidth },
          }}
        >
          <SidebarNav isCollapsed={false} />
        </Drawer>

        <Drawer
          variant="permanent"
          open={!isCollapsed}
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              whiteSpace: "nowrap",
              borderRight: "1px solid rgba(0,0,0,0.08)",
              backgroundColor: "#fff",
              ...(isCollapsed ? closedMixin(theme) : openedMixin(theme)),
            },
          }}
        >
          <SidebarNav isCollapsed={isCollapsed} />
        </Drawer>
      </Box>

      {/* MAIN LAYOUT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: "#fff",
            color: "text.primary",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
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
              <Menu />
            </IconButton>
            <IconButton
              onClick={handleCollapseToggle}
              sx={{
                mr: 2,
                display: { xs: "none", sm: "flex" },
                color: theme.palette.text.secondary,
              }}
            >
              {isCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </IconButton>

            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography
                variant="h6"
                fontWeight={800}
                color="primary.main"
                onClick={() => navigate("/about")}
                sx={{ cursor: "pointer", letterSpacing: "-0.5px" }}
              >
                KOSH
              </Typography>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ height: 24, alignSelf: "center" }}
              />
              <Typography
                variant="body2"
                fontWeight={500}
                onClick={() => navigate("/settings")}
                sx={{
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" },
                  maxWidth: 200,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {shop ? shop.shop_name : "Loading..."}
              </Typography>
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" alignItems="center" spacing={1}>
              <LowStockNotification />
              <OverduePaymentsNotification />
              <Tooltip title="Profile">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "primary.main",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => navigate("/settings")}
                  >
                    <User size={18} />
                  </Box>
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            p: 0,
            bgcolor: theme.palette.grey[50],
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
