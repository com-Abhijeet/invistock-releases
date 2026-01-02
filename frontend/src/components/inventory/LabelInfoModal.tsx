import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Info, Tag, ArrowRightLeft, RefreshCw } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Encoding Map
const encodeMap: Record<string, string> = {
  "1": "A",
  "2": "B",
  "3": "C",
  "4": "D",
  "5": "E",
  "6": "F",
  "7": "G",
  "8": "H",
  "9": "I",
  "0": "J",
};

// Decoding Map (Reverse of encodeMap)
const decodeMap: Record<string, string> = Object.fromEntries(
  Object.entries(encodeMap).map(([k, v]) => [v, k])
);

export default function LabelInfoModal({ open, onClose }: Props) {
  const [inputVal, setInputVal] = useState("");
  const [resultVal, setResultVal] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode"); // encode: Price -> Code, decode: Code -> Price

  const handleConvert = (val: string) => {
    setInputVal(val);
    if (!val) {
      setResultVal("");
      return;
    }

    const cleanVal = val.toUpperCase().trim();
    let output = "";

    if (mode === "encode") {
      // Numbers to Letters
      // Filter non-digits just in case, though input type number helps
      output = cleanVal
        .split("")
        .map((char) => encodeMap[char] || char)
        .join("");
    } else {
      // Letters to Numbers
      output = cleanVal
        .split("")
        .map((char) => decodeMap[char] || char)
        .join("");
    }
    setResultVal(output);
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "encode" ? "decode" : "encode"));
    setInputVal("");
    setResultVal("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tag size={20} />
        Understanding Product Labels
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Our labels are designed to provide key information quickly while
          keeping wholesale costs discreet.
        </Typography>

        <Box
          sx={{
            my: 2,
            p: 2,
            border: "1px solid #ddd",
            borderRadius: 2,
            bgcolor: "#f9fafb",
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>
            Label Layout Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="caption" fontWeight="bold">
                  Top Section:
                </Typography>
                <Typography variant="body2" fontSize="0.8rem">
                  Contains the <strong>Barcode</strong> for scanning.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Look closely in the barcode area for a small code (e.g.,
                  "ABJ"). This is your cost price encoded.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={8}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="caption" fontWeight="bold">
                  Bottom Left:
                </Typography>
                <Typography variant="body2" fontSize="0.8rem">
                  • <strong>Shop Name</strong>
                  <br />• <strong>Product Name</strong>
                  <br />• <strong>Product Code / SKU</strong>
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="caption" fontWeight="bold">
                  Bottom Right:
                </Typography>
                <Typography variant="body2" fontSize="0.8rem">
                  • <strong>Price</strong> (MRP or Sale Rate)
                  <br />• <strong>Size / Color</strong>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Info size={16} />
            <Typography variant="subtitle2" fontWeight="bold">
              Decoding the Wholesale Price
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            The discreet code (found near the barcode) reveals the{" "}
            <strong>MFW (Minimum Factory Wholesale)</strong> price using a
            simple substitution cipher:
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 1,
              textAlign: "center",
              mb: 3,
            }}
          >
            {[
              ["1", "A"],
              ["2", "B"],
              ["3", "C"],
              ["4", "D"],
              ["5", "E"],
              ["6", "F"],
              ["7", "G"],
              ["8", "H"],
              ["9", "I"],
              ["0", "J"],
            ].map(([num, letter]) => (
              <Box
                key={num}
                sx={{
                  border: "1px solid #eee",
                  borderRadius: 1,
                  p: 0.5,
                  bgcolor: "white",
                }}
              >
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                >
                  {letter}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {num}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Converter Tool */}
          <Box sx={{ bgcolor: "#eef2ff", p: 2, borderRadius: 2 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color="primary.main"
              >
                Secret Price Converter
              </Typography>
              <Button
                size="small"
                startIcon={<RefreshCw size={14} />}
                onClick={toggleMode}
                sx={{ textTransform: "none", fontSize: "0.75rem" }}
              >
                Switch to{" "}
                {mode === "encode"
                  ? "Decode (Code -> Price)"
                  : "Encode (Price -> Code)"}
              </Button>
            </Box>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label={mode === "encode" ? "Enter Price" : "Enter Code"}
                  placeholder={mode === "encode" ? "e.g. 120" : "e.g. ABJ"}
                  value={inputVal}
                  onChange={(e) => handleConvert(e.target.value)}
                  type={mode === "encode" ? "number" : "text"}
                  InputProps={{
                    sx: { bgcolor: "white" },
                  }}
                />
              </Grid>
              <Grid item xs={2} textAlign="center">
                <ArrowRightLeft size={20} className="text-gray-400" />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label={mode === "encode" ? "Secret Code" : "Actual Price"}
                  value={resultVal}
                  InputProps={{
                    readOnly: true,
                    sx: { bgcolor: "white", fontWeight: "bold" },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
