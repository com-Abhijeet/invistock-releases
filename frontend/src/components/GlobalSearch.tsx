"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import searchService, {
  SearchResults,
  SearchResultItem,
} from "../lib/api/searchService";
import theme from "../../theme";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcut: Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        // If there's already a query, open the dropdown
        if (query.length > 1) setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query]);

  // Debounce Logic
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
    }, 400); // 400ms debounce

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

  const handleNavigation = (item: SearchResultItem) => {
    setOpen(false);
    setQuery(""); // Clear search on nav

    switch (item.type) {
      case "product":
        navigate(`/product/${item.id}`);
        break;
      case "customer":
        navigate(`/customer/${item.id}`);
        break;
      case "supplier":
        navigate(`/viewSupplier/${item.id}`);
        break;
      case "sale":
        // Assuming you have a route to view invoices
        navigate(`/billing/view/${item.id}`);
        break;
      case "purchase":
        navigate(`/purchase/view/${item.id}`);
        break;
    }
  };

  const hasResults =
    results && Object.values(results).some((arr) => arr.length > 0);

  const renderSection = (
    title: string,
    items: SearchResultItem[] | undefined,
    icon: React.ReactNode,
    renderPrimary: (i: SearchResultItem) => string,
    renderSecondary: (i: SearchResultItem) => string
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <Box>
        <Typography
          variant="caption"
          fontWeight="bold"
          sx={{
            px: 2,
            py: 1,
            display: "block",
            color: "text.secondary",
            bgcolor: "grey.50",
          }}
        >
          {title.toUpperCase()}
        </Typography>
        {items.map((item) => (
          <ListItemButton
            key={`${item.type}-${item.id}`}
            onClick={() => handleNavigation(item)}
            sx={{ py: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={renderPrimary(item)}
              secondary={renderSecondary(item)}
              primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: "0.75rem" }}
            />
          </ListItemButton>
        ))}
        <Divider />
      </Box>
    );
  };

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
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      {/* Results Dropdown */}
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
          {loading && !results && (
            <Box p={2} textAlign="center">
              <Typography variant="body2">Searching...</Typography>
            </Box>
          )}

          {!loading && !hasResults && query.length > 1 && (
            <Box p={2} textAlign="center" color="text.secondary">
              <Typography variant="body2">
                No results found for "{query}"
              </Typography>
            </Box>
          )}

          {hasResults && (
            <List disablePadding>
              {renderSection(
                "Products",
                results?.products,
                <BoxIcon size={18} />,
                (i) => i.name || "",
                (i) => i.product_code || ""
              )}
              {renderSection(
                "Customers",
                results?.customers,
                <UserIcon size={18} />,
                (i) => i.name || "",
                (i) => i.phone || ""
              )}
              {renderSection(
                "Suppliers",
                results?.suppliers,
                <TruckIcon size={18} />,
                (i) => i.name || "",
                (i) => i.phone || ""
              )}
              {renderSection(
                "Sales Invoices",
                results?.sales,
                <FileIcon size={18} />,
                (i) => i.reference_no || "",
                (i) => `Total: ₹${i.total_amount}`
              )}
              {renderSection(
                "Purchases",
                results?.purchases,
                <CartIcon size={18} />,
                (i) => i.reference_no || "",
                (i) => `Total: ₹${i.total_amount}`
              )}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}
