"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  InputAdornment,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  Divider,
  Collapse,
  ListItemButton,
} from "@mui/material";
import {
  Search,
  Image as ImageIcon,
  Menu as MenuIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getProductsForMobile } from "../lib/api/productService";
import { getCategories } from "../lib/api/categoryService";
import type { Product } from "../lib/types/product";
import type { Category } from "../lib/types/categoryTypes";
import toast from "react-hot-toast";

export default function MobileProductView() {
  // Navigation State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [openCategory, setOpenCategory] = useState<number | null>(null);

  // Data & Filter State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(
    null
  );

  // Pagination & Loading State
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // --- 1. Data Fetching ---

  // Fetch categories for the drawer only once
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.error(err));
  }, []);

  // Main effect to fetch products
  useEffect(() => {
    setLoading(true);

    // This is a debounced search
    const handler = setTimeout(() => {
      // When filters change, reset products and page
      setProducts([]);
      setPage(1);
      setHasMore(true);

      fetchProducts(1);
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [searchTerm, selectedCategory, selectedSubcategory]);

  // Effect for infinite scrolling (loading more)
  useEffect(() => {
    // Don't run on the initial load (page 1)
    if (page > 1) {
      fetchProducts(page);
    }
  }, [page]);

  const fetchProducts = (pageToFetch: number) => {
    setLoading(true);

    // ✅ Call the new, dedicated mobile API function
    getProductsForMobile({
      page: pageToFetch,
      limit: 20,
      query: searchTerm,
      category: selectedCategory, // Pass category filters
      subcategory: selectedSubcategory,
      isActive: 1,
    })
      .then((data) => {
        // This logic is for infinite scroll:
        // If it's the first page, replace products.
        // If it's a new page, append products.
        setProducts((prev) =>
          pageToFetch === 1 ? data.records : [...prev, ...data.records]
        );

        setHasMore(data.records.length > 0);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load products."); // Added a user-facing error
        setLoading(false);
      });
  };
  // --- 2. Infinite Scroll Logic ---

  const observer = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback(
    (node: HTMLLIElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // --- 3. Handlers ---

  const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);
  const handleCategoryClick = (id: number) => {
    setOpenCategory(openCategory === id ? null : id);
  };

  const handleFilterSelect = (catId: number | null, subId: number | null) => {
    setSelectedCategory(catId);
    setSelectedSubcategory(subId);
    setDrawerOpen(false); // Close drawer on selection
  };

  // --- 4. Drawer Content ---

  const drawerContent = (
    <Box sx={{ width: 280 }} role="presentation">
      <Toolbar>
        <Typography variant="h6" fontWeight="bold">
          Categories
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItemButton onClick={() => handleFilterSelect(null, null)}>
          <ListItemText primary="All Products" sx={{ fontWeight: "bold" }} />
        </ListItemButton>

        {categories.map((cat) => (
          <React.Fragment key={cat.id}>
            <ListItemButton onClick={() => handleCategoryClick(cat.id || 0)}>
              <ListItemText primary={cat.name} sx={{ fontWeight: 500 }} />
              {openCategory === cat.id ? <ChevronDown /> : <ChevronRight />}
            </ListItemButton>
            <Collapse in={openCategory === cat.id} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {cat.subcategories.map((sub) => (
                  <ListItemButton
                    key={sub.id}
                    sx={{ pl: 4 }}
                    onClick={() => handleFilterSelect(cat.id || 0, sub.id || 0)}
                  >
                    <ListItemText primary={sub.name} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* --- Top AppBar with Search --- */}
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search products..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": { bgcolor: "white" },
              "& .MuiOutlinedInput-input": { p: 1.2 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Toolbar>
      </AppBar>

      {/* --- Category Drawer --- */}
      <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerToggle}>
        {drawerContent}
      </Drawer>

      {/* --- Main Content: Product List --- */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 1,
          backgroundColor: "grey.50",
        }}
      >
        <List>
          {products.map((product, index) => {
            // Assign the ref to the last element
            const isLastElement = index === products.length - 1;
            return (
              <ListItem
                key={product.id}
                divider
                ref={isLastElement ? lastProductElementRef : null}
              >
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    sx={{ width: 56, height: 56, mr: 1 }}
                    src={
                      product.image_url
                        ? `app-image://products/${product.image_url}`
                        : undefined
                    }
                  >
                    <ImageIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={product.name}
                  secondary={`Code: ${product.product_code}`}
                />
                <Box sx={{ textAlign: "right", ml: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {product.quantity}
                  </Typography>
                  <Typography variant="caption">in stock</Typography>
                </Box>
              </ListItem>
            );
          })}
        </List>

        {/* Loading Spinner at the bottom */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {/* End of List message */}
        {!loading && !hasMore && (
          <Typography textAlign="center" color="text.secondary" sx={{ p: 2 }}>
            No more products found.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
