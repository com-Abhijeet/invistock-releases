"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Sliders, Type, Store, Monitor, Printer } from "lucide-react";

// @ts-ignore
const ipcRenderer = window?.electron?.ipcRenderer;

const generatePreviewBarcode = (text: string) => {
  if (!text) return "";
  const hash = text
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let rects = "";
  let x = 0;
  for (let i = 0; i < 35; i++) {
    const width = i % 4 === 0 ? 2 : 1;
    const opacity = (i * 3 + hash) % 2 === 0 ? 1 : 0.15;
    rects += `<rect x="${x}" y="0" width="${width}" height="30" fill="black" fill-opacity="${opacity}" />`;
    x += width + 1;
  }
  return `<svg width="100%" height="25" viewBox="0 0 ${x} 30" preserveAspectRatio="none">${rects}</svg>`;
};

const getPreviewHTML = (config: any) => {
  const width = config.width || 50;
  const barcodeSVG = generatePreviewBarcode(config.barcode);
  const BRANDING = `<div style="text-align: center; font-size: 5px; color: #ccc; margin-top: 4px; font-style: italic;">powered by Kosh Software</div>`;
  const SHOP_NAME_HTML = config.showShopName
    ? `<div style="font-size: 8px; font-weight: 800; text-align: center; margin-bottom: 4px; border-bottom: 1px solid #eee; color: #555;">${config.shopName || "MY STORE"}</div>`
    : "";

  if (config.templateId === "custom_minimal") {
    return `
      <div style="width: ${width}mm; font-family: sans-serif; border: 1px dashed #999; padding: 10px; background: #fff; text-align: center; box-sizing: border-box;">
        ${config.showShopName ? `<div style="font-size: 7px; color: #888; margin-bottom: 2px;">${config.shopName || "STORE NAME"}</div>` : ""}
        <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">${config.name} ${config.showSize && config.size ? `(${config.size})` : ""}</div>
        ${config.showBarcode ? `<div style="margin: 5px 0;">${barcodeSVG}</div>` : ""}
        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 4px;">
           <span style="font-size: 14px; font-weight: 900;">₹${config.mrp}</span>
           ${config.showSecretCode ? `<span style="font-size: 14px; font-weight: 900;">/ ${config.customPriceCode}</span>` : ""}
        </div>
        ${BRANDING}
      </div>
    `;
  }

  // Standard Template logic for preview
  return `
    <div style="width: ${width}mm; font-family: sans-serif; border: 1.5px solid #000; padding: 8px; background: #fff; box-sizing: border-box; border-radius: 4px;">
      ${SHOP_NAME_HTML}
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
        <b style="font-size: 11px;">${config.name}</b>
        ${config.showSize && config.size ? `<span style="background:#000; color:#fff; font-size:9px; padding:1px 4px; border-radius: 2px; font-weight: 900;">${config.size}</span>` : ""}
      </div>
      ${config.showBarcode ? `<div style="margin: 6px 0;">${barcodeSVG}</div>` : ""}
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; border-top: 1px solid #eee; padding-top: 4px;">
        <span style="font-size: 15px; font-weight: 900;">₹${config.mrp}</span>
        ${config.showSecretCode ? `<span style="font-size: 11px; font-weight: 900;">${config.customPriceCode}</span>` : ""}
      </div>
      ${BRANDING}
    </div>
  `;
};

export default function CustomLabelPrintModal({
  open,
  onClose,
  product,
  shop,
}: any) {
  const [printing, setPrinting] = useState(false);
  const [config, setConfig] = useState({
    name: "",
    mrp: 0,
    size: "",
    barcode: "",
    customPriceCode: "",
    templateId: "custom_garment_standard",
    copies: 1,
    showSecretCode: true,
    showSize: true,
    showBarcode: true,
    showShopName: true,
    showPrintDialog: false, // Manual print override
    width: 50,
    shopName: "",
  });

  useEffect(() => {
    if (open && product) {
      setConfig({
        name: product.name || "",
        mrp: product.mrp || 0,
        size: product.size || "",
        barcode: product.barcode || product.product_code || "",
        customPriceCode: "",
        templateId: "custom_garment_standard",
        copies: 1,
        showSecretCode: true,
        showSize: true,
        showBarcode: true,
        showShopName: true,
        showPrintDialog: false,
        width: 50,
        shopName: shop?.shop_name || "",
      });
    }
  }, [open, product, shop]);

  const previewContent = useMemo(() => getPreviewHTML(config), [config]);

  const handlePrint = () => {
    if (!ipcRenderer) return toast.error("Desktop App Required");
    setPrinting(true);

    // We explicitly pass the silent flag based on user selection
    ipcRenderer.invoke("print-custom-label", {
      product: { name: config.name, mrp: config.mrp, size: config.size },
      ...config,
      silent: !config.showPrintDialog,
    });

    setTimeout(() => {
      toast.success(
        config.showPrintDialog
          ? "Opening Print Dialog..."
          : "Labels sent to printer",
      );
      setPrinting(false);
      onClose();
    }, 1500);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          fontWeight: "bold",
          bgcolor: "#fbfbfb",
        }}
      >
        <Monitor className="text-indigo-600" size={24} /> Custom Label Designer
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 1,
                    fontWeight: "bold",
                  }}
                >
                  <Type size={14} /> PRODUCT DETAILS
                </Typography>
                <TextField
                  label="Name"
                  value={config.name}
                  onChange={(e) =>
                    setConfig({ ...config, name: e.target.value })
                  }
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="MRP"
                    type="number"
                    value={config.mrp}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        mrp: parseFloat(e.target.value) || 0,
                      })
                    }
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Size"
                    value={config.size}
                    onChange={(e) =>
                      setConfig({ ...config, size: e.target.value })
                    }
                    fullWidth
                    size="small"
                  />
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 1,
                    fontWeight: "bold",
                  }}
                >
                  <Store size={14} /> SHOP & CODES
                </Typography>
                <TextField
                  label="Barcode"
                  value={config.barcode}
                  onChange={(e) =>
                    setConfig({ ...config, barcode: e.target.value })
                  }
                  fullWidth
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Secret Code"
                  value={config.customPriceCode}
                  onChange={(e) =>
                    setConfig({ ...config, customPriceCode: e.target.value })
                  }
                  fullWidth
                  size="small"
                />
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 1,
                    fontWeight: "bold",
                  }}
                >
                  <Sliders size={14} /> STYLE OPTIONS
                </Typography>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Template Style</InputLabel>
                  <Select
                    value={config.templateId}
                    label="Template Style"
                    onChange={(e) =>
                      setConfig({ ...config, templateId: e.target.value })
                    }
                  >
                    <MenuItem value="custom_garment_standard">
                      Standard Boxed
                    </MenuItem>
                    <MenuItem value="custom_minimal">Minimal Dashed</MenuItem>
                    <MenuItem value="custom_bold_tag">
                      Premium Bold Tag
                    </MenuItem>
                  </Select>
                </FormControl>

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    bgcolor: "#f5f5f5",
                    p: 1.5,
                    borderRadius: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={config.showShopName}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showShopName: e.target.checked,
                          })
                        }
                      />
                    }
                    label={
                      <Typography variant="body2">Show Shop Name</Typography>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={config.showBarcode}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showBarcode: e.target.checked,
                          })
                        }
                      />
                    }
                    label={<Typography variant="body2">Barcode</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={config.showSecretCode}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showSecretCode: e.target.checked,
                          })
                        }
                      />
                    }
                    label={<Typography variant="body2">Secret Code</Typography>}
                  />
                </Box>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 1,
                    fontWeight: "bold",
                  }}
                >
                  <Printer size={14} /> PRINT SETTINGS
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    type="number"
                    label="Copies"
                    value={config.copies}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        copies: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    size="small"
                    sx={{ width: 100 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={config.showPrintDialog}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showPrintDialog: e.target.checked,
                          })
                        }
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Manual Print (Show Dialog)
                      </Typography>
                    }
                  />
                </Box>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                bgcolor: "#f8fafc",
                borderRadius: 4,
                height: "100%",
                minHeight: 380,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                border: "1px solid #e2e8f0",
              }}
            >
              <Box
                sx={{
                  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                  bgcolor: "white",
                  p: 1,
                  borderRadius: 1,
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: previewContent }} />
              </Box>
              <Typography
                variant="caption"
                sx={{ mt: 3, color: "text.disabled" }}
              >
                Preview Scale: 1:1 ({config.width}mm width)
              </Typography>
              {config.showPrintDialog && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ mt: 1, fontWeight: "bold" }}
                >
                  * System Print Dialog will appear
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          disabled={printing}
          sx={{ px: 4, borderRadius: 2 }}
        >
          {printing ? "Preparing Printer..." : "Print Labels"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
