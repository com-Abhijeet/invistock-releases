"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  InputBase,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Box as BoxIcon,
  User as UserIcon,
  Truck as TruckIcon,
  FileText as FileIcon,
  ShoppingCart as CartIcon,
  Navigation as NavIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import searchService, {
  SearchResults,
  SearchResultItem,
} from "../lib/api/searchService";
import { menuSections } from "../config/menu";
import theme from "../../theme";

// Define a unified type for keyboard navigation
type FlattenedResult = {
  id: string | number;
  label: string;
  secondary: string;
  icon: React.ReactNode;
  type: "page" | "product" | "customer" | "supplier" | "sale" | "purchase";
  path?: string;
  originalItem?: SearchResultItem;
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Flatten results for keyboard navigation logic
  const flattenedResults = useMemo(() => {
    const list: FlattenedResult[] = [];

    // 1. Pages
    if (query.trim().length >= 2) {
      menuSections.forEach((section: any) => {
        section.items.forEach((item: any) => {
          if (item.label.toLowerCase().includes(query.toLowerCase())) {
            list.push({
              id: `page-${item.path}`,
              label: item.label,
              secondary: `Maps to ${section.title}`,
              icon: item.icon || <NavIcon size={18} />,
              type: "page",
              path: item.path,
            });
          }
        });
      });
    }

    // 2. API Results
    if (results) {
      results.products?.forEach((i) =>
        list.push({
          id: `prod-${i.id}`,
          label: i.name || "",
          secondary: i.product_code || "",
          icon: <BoxIcon size={18} />,
          type: "product",
          originalItem: i,
        }),
      );
      results.customers?.forEach((i) =>
        list.push({
          id: `cust-${i.id}`,
          label: i.name || "",
          secondary: i.phone || "",
          icon: <UserIcon size={18} />,
          type: "customer",
          originalItem: i,
        }),
      );
      results.suppliers?.forEach((i) =>
        list.push({
          id: `supp-${i.id}`,
          label: i.name || "",
          secondary: i.phone || "",
          icon: <TruckIcon size={18} />,
          type: "supplier",
          originalItem: i,
        }),
      );
      results.sales?.forEach((i) =>
        list.push({
          id: `sale-${i.id}`,
          label: i.reference_no || "",
          secondary: `Total: ₹${i.total_amount}`,
          icon: <FileIcon size={18} />,
          type: "sale",
          originalItem: i,
        }),
      );
      results.purchases?.forEach((i) =>
        list.push({
          id: `pur-${i.id}`,
          label: i.reference_no || "",
          secondary: `Total: ₹${i.total_amount}`,
          icon: <CartIcon size={18} />,
          type: "purchase",
          originalItem: i,
        }),
      );
    }

    return list;
  }, [query, results]);

  // Reset selection when query or results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query, results]);

  // Handle Item Navigation
  const executeSelection = (item: FlattenedResult) => {
    setOpen(false);
    setQuery("");

    if (item.type === "page" && item.path) {
      navigate(item.path);
    } else if (item.originalItem) {
      const { id } = item.originalItem;
      switch (item.type) {
        case "product":
          navigate(`/product/${id}`);
          break;
        case "customer":
          navigate(`/customer/${id}`);
          break;
        case "supplier":
          navigate(`/viewSupplier/${id}`);
          break;
        case "sale":
          navigate(`/billing/view/${id}`);
          break;
        case "purchase":
          navigate(`/purchase/view/${id}`);
          break;
      }
    }
  };

  // Keyboard Shortcuts & Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setSelectedIndex((prev) =>
        prev < flattenedResults.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && flattenedResults[selectedIndex]) {
        executeSelection(flattenedResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  // Global Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // API Search Logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        setOpen(true);
        try {
          const data = await searchService.globalSearch(query);
          setResults(data);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults(null);
        setOpen(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll into view when navigating via keyboard
  useEffect(() => {
    if (selectedIndex >= 0) {
      const activeElement = document.getElementById(
        `search-item-${selectedIndex}`,
      );
      activeElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <Box
      ref={searchContainerRef}
      sx={{
        position: "relative",
        width: { xs: "100%", sm: 300, md: 400 },
        mr: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          bgcolor: "grey.100",
          borderRadius: 2,
          px: 1.5,
          py: 0.5,
          border: "1px solid transparent",
          "&:focus-within": {
            bgcolor: "background.paper",
            border: `1px solid ${theme.palette.primary.main}`,
            boxShadow: `0 0 0 2px ${theme.palette.action.hover}`,
          },
          transition: "all 0.2s",
        }}
      >
        <SearchIcon size={20} color={theme.palette.text.secondary} />
        <InputBase
          inputRef={inputRef}
          placeholder="Search items or pages (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ ml: 1, flex: 1, fontSize: "0.9rem" }}
          onFocus={() => {
            if (query.length > 1) setOpen(true);
          }}
        />
        {loading ? (
          <CircularProgress size={16} />
        ) : (
          <Chip
            label="Ctrl + K"
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: "bold",
              bgcolor: "grey.200",
              color: "text.secondary",
              cursor: "pointer",
            }}
            onClick={() => inputRef.current?.focus()}
          />
        )}
      </Box>

      {open && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: "70vh",
            overflowY: "auto",
            zIndex: 1300,
            borderRadius: 2,
          }}
        >
          {loading && flattenedResults.length === 0 && (
            <Box p={2} textAlign="center">
              <Typography variant="body2">Searching...</Typography>
            </Box>
          )}

          {!loading && flattenedResults.length === 0 && query.length > 1 && (
            <Box p={2} textAlign="center" color="text.secondary">
              <Typography variant="body2">
                No results found for "{query}"
              </Typography>
            </Box>
          )}

          <List disablePadding ref={listRef}>
            {flattenedResults.map((item, index) => {
              const isFirstOfCategory =
                index === 0 || flattenedResults[index - 1].type !== item.type;

              return (
                <Box key={item.id}>
                  {isFirstOfCategory && (
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      sx={{
                        px: 2,
                        py: 0.8,
                        display: "block",
                        color:
                          item.type === "page"
                            ? "primary.main"
                            : "text.secondary",
                        bgcolor:
                          item.type === "page" ? "primary.50" : "grey.50",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.type === "page"
                        ? "Pages & Actions"
                        : `${item.type}s`}
                    </Typography>
                  )}
                  <ListItemButton
                    id={`search-item-${index}`}
                    selected={selectedIndex === index}
                    onClick={() => executeSelection(item)}
                    sx={{
                      py: 0.5,
                      "&.Mui-selected": {
                        bgcolor: "action.selected",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color:
                          selectedIndex === index
                            ? "primary.main"
                            : "text.secondary",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.secondary}
                      primaryTypographyProps={{
                        fontSize: "0.9rem",
                        fontWeight: selectedIndex === index ? 600 : 500,
                      }}
                      secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                  </ListItemButton>
                  {index < flattenedResults.length - 1 &&
                    flattenedResults[index + 1].type !== item.type && (
                      <Divider />
                    )}
                </Box>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
}
