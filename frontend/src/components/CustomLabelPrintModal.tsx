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
import { Sliders, Type, Store, Monitor, Printer, RotateCw } from "lucide-react";

// @ts-ignore
const ipcRenderer = window?.electron?.ipcRenderer;

// Generates a mock barcode SVG as a Base64 string so it behaves exactly like the backend PNG
const generatePreviewBarcodeBase64 = (text: string) => {
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="25" viewBox="0 0 ${x} 30" preserveAspectRatio="none">${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Perfectly mirrors the backend Flexbox Engine
const getPreviewHTML = (config: any) => {
  const barcodeImg = generatePreviewBarcodeBase64(config.barcode);

  const singleLabel = () => {
    const isRotated = config.rotation === 90 || config.rotation === 270;
    const contentWidth = isRotated ? config.height : config.width;
    const contentHeight = isRotated ? config.width : config.height;

    const hScale = Math.min(1, contentHeight / 25);
    const fontScale = Math.max(0.55, hScale);

    const fz = (size: number) => `${(size * fontScale).toFixed(1)}px`;
    const pad = (size: number) => `${(size * fontScale).toFixed(1)}px`;

    let innerContent = "";

    if (config.templateId === "custom_minimal") {
      innerContent = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; padding: ${pad(3)}; background: #fff; border: 1px dashed #777; display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          ${
            config.showShopName && config.shopName
              ? `
            <div style="font-size: ${fz(7)}; color: #666; text-align: center; margin-bottom: ${pad(2)}; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${config.shopName}</div>
          `
              : ""
          }
          <div style="font-size: ${fz(10)}; font-weight: 700; text-align: center; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${config.name} ${config.showSize && config.size ? `(${config.size})` : ""}
          </div>
          ${
            config.showBarcode
              ? `
            <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: ${pad(2)} 0; overflow: hidden;">
              <img src="${barcodeImg}" style="max-width: 90%; max-height: 100%; object-fit: contain; flex-grow: 1; min-height: 0; display: block;" />
              ${config.showBarcodeText ? `<div style="font-size: ${fz(7.5)}; font-weight: 600; text-align: center; margin-top: 1px; line-height: 1; flex-shrink: 0; font-family: monospace;">${config.barcode || ""}</div>` : ""}
            </div>
          `
              : `<div style="flex-grow: 1; min-height: 0;"></div>`
          }
          <div style="display: flex; justify-content: center; gap: ${pad(8)}; align-items: baseline; flex-shrink: 0; line-height: 1;">
            <div style="font-size: ${fz(13)}; font-weight: 900; color: #000;">₹${config.mrp || 0}</div>
            ${config.showSecretCode && config.customPriceCode ? `<div style="font-size: ${fz(9)}; font-weight: 800; color: #444;">/ ${config.customPriceCode}</div>` : ""}
          </div>
        </div>
      `;
    } else if (config.templateId === "custom_bold_tag") {
      innerContent = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; background: #fff; border: 2px solid #000; border-radius: ${pad(6)}; display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="background: #000; color: #fff; padding: ${pad(3)}; text-align: center; font-size: ${fz(10)}; font-weight: 800; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${config.showShopName && config.shopName ? config.shopName.toUpperCase() : config.name.toUpperCase()}
          </div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; padding: ${pad(3)}; overflow: hidden;">
            ${config.showShopName && config.shopName ? `<div style="font-size: ${fz(8)}; font-weight: 700; text-align: center; margin-bottom: ${pad(2)}; flex-shrink: 0;">${config.name}</div>` : ""}
            <div style="font-size: ${fz(16)}; font-weight: 900; text-align: center; margin: ${pad(2)} 0; flex-shrink: 0; line-height: 1;">₹${config.mrp}</div>
            ${
              config.showBarcode
                ? `
              <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${barcodeImg}" style="max-width: 90%; max-height: 100%; object-fit: contain; flex-grow: 1; min-height: 0; display: block;" />
                ${config.showBarcodeText ? `<div style="font-size: ${fz(7.5)}; font-weight: 600; text-align: center; margin-top: 1px; line-height: 1; flex-shrink: 0; font-family: monospace;">${config.barcode || ""}</div>` : ""}
              </div>
            `
                : `<div style="flex-grow: 1; min-height: 0;"></div>`
            }
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: ${pad(2)}; border-top: 1px solid #000; padding-top: ${pad(2)}; flex-shrink: 0; line-height: 1;">
              ${config.showSize && config.size ? `<div style="font-size: ${fz(8)}; font-weight: 800;">SIZE: ${config.size}</div>` : "<div></div>"}
              ${config.showSecretCode && config.customPriceCode ? `<div style="font-size: ${fz(10)}; font-weight: 900;">${config.customPriceCode}</div>` : ""}
            </div>
          </div>
        </div>
      `;
    } else {
      // Standard
      innerContent = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; padding: ${pad(3)}; background: #fff; border: 1.5px solid #000; border-radius: ${pad(4)}; display: flex; flex-direction: column; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          ${
            config.showShopName && config.shopName
              ? `
            <div style="font-size: ${fz(8)}; font-weight: 800; text-align: center; text-transform: uppercase; border-bottom: 0.5px solid #ccc; padding-bottom: ${pad(2)}; margin-bottom: ${pad(2)}; line-height: 1; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #333;">
              ${config.shopName}
            </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; align-items: flex-start; line-height: 1; flex-shrink: 0; gap: 4px;">
            <div style="font-size: ${fz(10)}; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1;">${config.name || "Product"}</div>
            ${config.showSize && config.size ? `<div style="background: #000; color: #fff; font-size: ${fz(8)}; padding: ${pad(1)} ${pad(3)}; border-radius: 2px; font-weight: 900; white-space: nowrap;">${config.size}</div>` : ""}
          </div>
          ${
            config.showBarcode
              ? `
            <div style="flex-grow: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: ${pad(2)} 0; overflow: hidden;">
              <img src="${barcodeImg}" style="max-width: 100%; max-height: 100%; object-fit: contain; flex-grow: 1; min-height: 0; display: block;" />
              ${config.showBarcodeText ? `<div style="font-size: ${fz(7.5)}; font-weight: 600; text-align: center; margin-top: 1px; line-height: 1; flex-shrink: 0; font-family: monospace;">${config.barcode || ""}</div>` : ""}
            </div>
          `
              : `<div style="flex-grow: 1; min-height: 0;"></div>`
          }
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 0.5px solid #eee; padding-top: ${pad(2)}; flex-shrink: 0; line-height: 1;">
            <div style="font-size: ${fz(14)}; font-weight: 900; letter-spacing: -0.5px; color: #000;">₹${config.mrp || 0}</div>
            ${config.showSecretCode && config.customPriceCode ? `<div style="font-size: ${fz(9)}; font-weight: 800; color: #444;">${config.customPriceCode}</div>` : ""}
          </div>
        </div>
      `;
    }

    return `
      <div style="width: ${config.width}mm; height: ${config.height}mm; position: relative; overflow: hidden; background: white;">
        <div style="
          width: ${contentWidth}mm; 
          height: ${contentHeight}mm; 
          position: absolute; 
          top: 50%; left: 50%; 
          transform: translate(-50%, -50%) rotate(${config.rotation || 0}deg); 
          transform-origin: center center;
        ">
          ${innerContent}
        </div>
      </div>
    `;
  };

  const labels = Array.from({ length: config.colsPerRow }, () => singleLabel());

  return `
    <div style="display: grid; grid-template-columns: repeat(${config.colsPerRow}, ${config.width}mm); gap: ${config.gapBetweenCols}mm; align-items: start; justify-content: center;">
      ${labels.join("")}
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
    showBarcodeText: true,
    showShopName: true,
    showPrintDialog: false,
    width: 50,
    height: 25,
    rotation: 0,
    colsPerRow: 1,
    gapBetweenCols: 0,
    horizontalOffset: 0,
    verticalOffset: 0,
    shopName: shop?.shop_name || "MY STORE",
  });
  const [dragState, setDragState] = useState<null | {
    type: "width" | "height" | "offset";
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startOffsetX: number;
    startOffsetY: number;
  }>(null);
  const [previewScale, setPreviewScale] = useState(1.5);

  useEffect(() => {
    const cached = localStorage.getItem("customLabelConfig");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          shopName: shop?.shop_name || prev.shopName,
        }));
      } catch (e) {
        console.error("Failed to load cached config", e);
      }
    }
  }, [shop]);

  useEffect(() => {
    const toCache = {
      templateId: config.templateId,
      copies: config.copies,
      showSecretCode: config.showSecretCode,
      showSize: config.showSize,
      showBarcode: config.showBarcode,
      showBarcodeText: config.showBarcodeText,
      showShopName: config.showShopName,
      showPrintDialog: config.showPrintDialog,
      width: config.width,
      height: config.height,
      rotation: config.rotation,
      colsPerRow: config.colsPerRow,
      gapBetweenCols: config.gapBetweenCols,
      horizontalOffset: config.horizontalOffset,
      verticalOffset: config.verticalOffset,
      shopName: config.shopName,
    };
    localStorage.setItem("customLabelConfig", JSON.stringify(toCache));
  }, [config]);

  useEffect(() => {
    const totalLabelWidth =
      config.width * config.colsPerRow +
      config.gapBetweenCols * Math.max(0, config.colsPerRow - 1);
    const safeScale = Math.min(
      1.7,
      Math.max(0.7, 350 / Math.max(10, totalLabelWidth)),
    );
    setPreviewScale(safeScale);
  }, [config.width, config.colsPerRow, config.gapBetweenCols]);

  useEffect(() => {
    if (open && product) {
      setConfig((prev) => ({
        ...prev,
        name: product.name || "",
        mrp: product.mrp || 0,
        size: product.size || "",
        barcode: product.barcode || product.product_code || "",
        customPriceCode: "",
      }));
    }
  }, [open, product]);

  const handlePointerDown = (
    event: any,
    type: "width" | "height" | "offset",
  ) => {
    event.preventDefault();
    setDragState({
      type,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: config.width,
      startHeight: config.height,
      startOffsetX: config.horizontalOffset,
      startOffsetY: config.verticalOffset,
    });
  };

  useEffect(() => {
    if (!dragState) return;
    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      const deltaMm = Math.round(dx / (previewScale * 3.8)); // Pixel to mm ratio approx
      const deltaMmY = Math.round(dy / (previewScale * 3.8));

      if (dragState.type === "width")
        setConfig((prev) => ({
          ...prev,
          width: Math.max(10, dragState.startWidth + deltaMm),
        }));
      if (dragState.type === "height")
        setConfig((prev) => ({
          ...prev,
          height: Math.max(10, dragState.startHeight + deltaMmY),
        }));
      if (dragState.type === "offset") {
        setConfig((prev) => ({
          ...prev,
          horizontalOffset: Math.max(0, dragState.startOffsetX + deltaMm),
          verticalOffset: Math.max(0, dragState.startOffsetY + deltaMmY),
        }));
      }
    };
    const handlePointerUp = () => setDragState(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, previewScale]);

  const previewContent = useMemo(() => getPreviewHTML(config), [config]);
  const totalLabelWidth =
    config.width * config.colsPerRow +
    config.gapBetweenCols * Math.max(0, config.colsPerRow - 1);

  const handlePrint = () => {
    if (!ipcRenderer) return toast.error("Desktop App Required");
    setPrinting(true);
    ipcRenderer.invoke("print-custom-label", {
      product: {
        name: config.name,
        mrp: config.mrp,
        size: config.size,
        barcode: config.barcode,
      },
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
                  <Store size={14} /> BARCODE & CODES
                </Typography>
                <TextField
                  label="Barcode String"
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
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <FormControl fullWidth size="small">
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
                  <FormControl fullWidth size="small">
                    <InputLabel>Content Rotation</InputLabel>
                    <Select
                      value={config.rotation}
                      label="Content Rotation"
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          rotation: Number(e.target.value),
                        })
                      }
                    >
                      <MenuItem value={0}>0° (Portrait Feed)</MenuItem>
                      <MenuItem value={90}>90° (Landscape Feed)</MenuItem>
                      <MenuItem value={180}>180° (Upside Down)</MenuItem>
                      <MenuItem value={270}>270° (Landscape Inverse)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

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
                    label={<Typography variant="body2">Shop Name</Typography>}
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
                        checked={config.showBarcodeText}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            showBarcodeText: e.target.checked,
                          })
                        }
                      />
                    }
                    label={
                      <Typography variant="body2">Barcode Text</Typography>
                    }
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
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={config.showSize}
                        onChange={(e) =>
                          setConfig({ ...config, showSize: e.target.checked })
                        }
                      />
                    }
                    label={<Typography variant="body2">Size Tag</Typography>}
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
                  <Printer size={14} /> DIMENSIONS & PRINT
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <TextField
                      type="number"
                      label="Width (mm)"
                      value={config.width}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          width: parseFloat(e.target.value) || 50,
                        })
                      }
                      size="small"
                      sx={{ width: 100 }}
                    />
                    <TextField
                      type="number"
                      label="Height (mm)"
                      value={config.height}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          height: parseFloat(e.target.value) || 25,
                        })
                      }
                      size="small"
                      sx={{ width: 100 }}
                    />
                    <TextField
                      type="number"
                      label="Cols per Row"
                      value={config.colsPerRow}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          colsPerRow: Math.max(
                            1,
                            parseInt(e.target.value) || 1,
                          ),
                        })
                      }
                      size="small"
                      sx={{ width: 100 }}
                    />
                    <TextField
                      type="number"
                      label="Gap (mm)"
                      value={config.gapBetweenCols}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          gapBetweenCols: parseFloat(e.target.value) || 0,
                        })
                      }
                      size="small"
                      sx={{ width: 100 }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <TextField
                      type="number"
                      label="Horiz Offset (mm)"
                      value={config.horizontalOffset}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          horizontalOffset: parseFloat(e.target.value) || 0,
                        })
                      }
                      size="small"
                      sx={{ width: 140 }}
                    />
                    <TextField
                      type="number"
                      label="Vert Offset (mm)"
                      value={config.verticalOffset}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          verticalOffset: parseFloat(e.target.value) || 0,
                        })
                      }
                      size="small"
                      sx={{ width: 140 }}
                    />
                  </Box>
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
                </Stack>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box
              sx={{
                bgcolor: "#f8fafc",
                borderRadius: 4,
                height: "100%",
                minHeight: 450,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography
                variant="caption"
                sx={{ mb: 2, color: "text.secondary", fontWeight: "bold" }}
              >
                Label Roll Preview
              </Typography>
              <Box
                sx={{
                  width: "100%",
                  flexGrow: 1,
                  bgcolor: "#eef3ff",
                  borderRadius: 3,
                  border: "1px solid #cbd5e1",
                  p: 1,
                  overflow: "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    width: `${totalLabelWidth}mm`,
                    minHeight: `${config.height + config.verticalOffset + 10}mm`,
                    position: "relative",
                    background: "#fff",
                    border: "1px dashed #94a3b8",
                    boxSizing: "border-box",
                    p: 0.5,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: `${config.verticalOffset}mm`,
                      left: `${config.horizontalOffset}mm`,
                      minWidth: `${totalLabelWidth}mm`,
                      height: `${config.height}mm`,
                      cursor:
                        dragState?.type === "offset" ? "grabbing" : "grab",
                    }}
                    onPointerDown={(event: any) =>
                      handlePointerDown(event, "offset")
                    }
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: `calc(${config.verticalOffset}mm + ${config.height / 2}mm)`,
                      left: `calc(${config.horizontalOffset}mm + ${totalLabelWidth}mm)`,
                      width: "8px",
                      height: `${config.height}mm`,
                      transform: "translate(-50%, -50%)",
                      cursor: "ew-resize",
                      zIndex: 5,
                    }}
                    onPointerDown={(event: any) =>
                      handlePointerDown(event, "width")
                    }
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: `calc(${config.verticalOffset}mm + ${config.height}mm)`,
                      left: `calc(${config.horizontalOffset}mm + ${totalLabelWidth / 2}mm)`,
                      width: `${totalLabelWidth}mm`,
                      height: "8px",
                      transform: "translate(-50%, -50%)",
                      cursor: "ns-resize",
                      zIndex: 5,
                    }}
                    onPointerDown={(event: any) =>
                      handlePointerDown(event, "height")
                    }
                  />
                </Box>
              </Box>
              <Typography
                variant="caption"
                sx={{ mt: 2, color: "text.disabled" }}
              >
                Label: {config.width}mm x {config.height}mm | Columns:{" "}
                {config.colsPerRow} | Gap: {config.gapBetweenCols}mm
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                Offsets: {config.horizontalOffset}mm × {config.verticalOffset}mm
                | Rotation: {config.rotation}°
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
