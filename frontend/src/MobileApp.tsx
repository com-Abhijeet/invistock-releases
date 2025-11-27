import { useState, useEffect, useRef } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  Drawer,
  Collapse,
  ListItemButton,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  ScanBarcode,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { getCategories } from "./lib/api/categoryService"; // Reuse this too!
import type { Product } from "./lib/types/product";
import type { Category } from "./lib/types/categoryTypes";
import { api } from "./lib/api/api";

export default function MobileApp() {
  // --- STATE ---
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Scanner Ref
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // --- EFFECTS ---

  useEffect(() => {
    // Load Categories on mount
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    // Reset list when filters change
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchData(1, searchTerm, selectedCat, selectedSub);
  }, [selectedCat, selectedSub]); // Search term handled separately via button for performance

  // --- DATA FETCHING ---

  const fetchData = async (
    pageNo: number,
    q: string,
    cat: number | null,
    sub: number | null
  ) => {
    setLoading(true);
    try {
      // ✅ Updated to fetch directly from the mobile data endpoint
      const res = await api.get("/mobile/data", {
        params: {
          page: pageNo,
          limit: 20,
          query: q,
          category: cat,
          subcategory: sub,
          isActive: 1, // Filter for active products
        },
      });

      const data = res.data; // Axios response data

      setProducts((prev) =>
        pageNo === 1 ? data.records : [...prev, ...data.records]
      );
      setHasMore(data.records.length > 0);
    } catch (err) {
      console.error("Failed to fetch mobile data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, searchTerm, selectedCat, selectedSub);
  };

  const handleSearch = () => {
    setProducts([]);
    setPage(1);
    fetchData(1, searchTerm, selectedCat, selectedSub);
  };

  // --- SCANNER LOGIC ---

  const startScanner = () => {
    setScannerOpen(true);
    // Slight delay to let DOM render the container
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Success
            handleStopScanner();
            setSearchTerm(decodedText);
            // Trigger search immediately
            setProducts([]);
            setPage(1);
            fetchData(1, decodedText, selectedCat, selectedSub);
          },
          (errorMessage) => {
            console.log(errorMessage);
          }
        )
        .catch((err) => {
          console.error(err);
          setScannerOpen(false);
        });
    }, 100);
  };

  const handleStopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current?.clear();
          setScannerOpen(false);
        })
        .catch(console.error);
    } else {
      setScannerOpen(false);
    }
  };

  // --- RENDER ---

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.100",
      }}
    >
      {/* 1. Header */}
      <AppBar position="static" sx={{ bgcolor: "#232f3e" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            KOSH
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 2. Search Bar */}
      <Box sx={{ p: 2, bgcolor: "white", borderBottom: "1px solid #eee" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={startScanner} color="primary">
                  <ScanBarcode />
                </IconButton>
                <IconButton
                  onClick={handleSearch}
                  sx={{
                    bgcolor: "#febd69",
                    color: "black",
                    ml: 1,
                    borderRadius: 1,
                    "&:hover": { bgcolor: "#f0a848" },
                  }}
                >
                  <Search size={20} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* 3. Scanner Overlay */}
      {scannerOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            id="reader"
            sx={{ width: "300px", height: "300px", bgcolor: "black" }}
          />
          <Typography color="white" sx={{ mt: 2 }}>
            Scanning...
          </Typography>
          <button
            onClick={handleStopScanner}
            style={{ marginTop: 20, padding: "10px 20px", fontSize: 16 }}
          >
            Close
          </button>
        </Box>
      )}

      {/* 4. Product List */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 1 }}>
        <List>
          {products.map((p) => {
            const isLow =
              p.low_stock_threshold ||
              (0 > 0 && p.quantity <= p.low_stock_threshold!);
            return (
              <ListItem
                key={p.id}
                sx={{ bgcolor: "white", mb: 1, borderRadius: 2, boxShadow: 1 }}
              >
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    src={p.image_url ? `/images/${p.image_url}` : undefined}
                  >
                    <ImageIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={p.name}
                  secondary={
                    <>
                      <Typography variant="caption" display="block">
                        {p.product_code}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="text.primary"
                      >
                        ₹{p.mop?.toLocaleString("en-IN")}
                      </Typography>
                    </>
                  }
                />
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={isLow ? "error.main" : "success.main"}
                  >
                    {p.quantity}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Stock
                  </Typography>
                </Box>
              </ListItem>
            );
          })}
        </List>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && hasMore && products.length > 0 && (
          <Box textAlign="center" py={2}>
            <button
              onClick={handleLoadMore}
              style={{
                padding: "10px 20px",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: 20,
              }}
            >
              Load More
            </button>
          </Box>
        )}
      </Box>

      {/* 5. Sidebar Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250 }}>
          <Box sx={{ p: 2, bgcolor: "#232f3e", color: "white" }}>
            <Typography variant="h6">Categories</Typography>
          </Box>
          <List>
            <ListItemButton
              onClick={() => {
                setSelectedCat(null);
                setSelectedSub(null);
                setDrawerOpen(false);
              }}
            >
              <ListItemText primary="All Products" />
            </ListItemButton>
            {categories.map((cat) => (
              <CategoryItem
                key={cat.id}
                category={cat}
                onSelect={(c, s) => {
                  setSelectedCat(c);
                  setSelectedSub(s);
                  setDrawerOpen(false);
                }}
              />
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
}

// Helper for Accordion Menu
function CategoryItem({
  category,
  onSelect,
}: {
  category: Category;
  onSelect: (c: number, s: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasSubs = category.subcategories && category.subcategories.length > 0;

  return (
    <>
      <ListItemButton
        onClick={() =>
          hasSubs ? setOpen(!open) : onSelect(category.id!, null)
        }
      >
        <ListItemText primary={category.name} />
        {hasSubs &&
          (open ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
      </ListItemButton>
      {hasSubs && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => onSelect(category.id!, null)}
            >
              <ListItemText primary={`All in ${category.name}`} />
            </ListItemButton>
            {category.subcategories.map((sub) => (
              <ListItemButton
                key={sub.id}
                sx={{ pl: 4 }}
                onClick={() => onSelect(category.id!, sub.id!)}
              >
                <ListItemText primary={sub.name} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}
