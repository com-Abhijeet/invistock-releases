"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  SelectChangeEvent,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import { importProducts } from "../../lib/api/productService"; // Adjust path as needed

// Get the ipcRenderer exposed by your preload script
const { ipcRenderer } = window.electron;

// Define the props for the component
interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

const steps = ["Upload File", "Map Columns", "Preview & Import"];

// These are the required fields for a new product in your database.
// The user will map their Excel columns to these fields.
const requiredDbFields = [
  "name",
  "product_code",
  "mrp",
  "mop",
  "mfw_price",
  "gst_rate",
  "quantity",
  "hsn",
  "brand",
  "low_stock_threshold",
  "size",
  "weight",
  "category",
  "subcategory",
  "average_purchase_price",
  "storage_location",
  "description",
  "barcode",
];

export default function ProductImportModal({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [filePath, setFilePath] = useState("");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const handleFileSelect = async () => {
    if (!ipcRenderer) return toast.error("Desktop features not available.");

    const selectedPath = await ipcRenderer.invoke("dialog:open-file", {
      title: "Select Excel File",
      filters: [{ name: "Spreadsheets", extensions: ["xlsx", "xls", "csv"] }],
    });

    if (selectedPath) {
      setFilePath(selectedPath);
      const fileData = await ipcRenderer.invoke(
        "read-excel-file",
        selectedPath
      );

      if (fileData.success) {
        setFileHeaders(fileData.headers);
        setPreviewData(fileData.dataPreview);

        // Attempt to auto-map columns based on similar names
        const initialMappings: Record<string, string> = {};
        requiredDbFields.forEach((dbField) => {
          const foundHeader = fileData.headers.find(
            (h: string) =>
              h.toLowerCase().replace(/[\s_]/g, "") ===
              dbField.toLowerCase().replace(/[\s_]/g, "")
          );
          if (foundHeader) {
            initialMappings[dbField] = foundHeader;
          }
        });
        setMappings(initialMappings);
        setActiveStep(1); // Move to the next step
      } else {
        toast.error(fileData.error);
      }
    }
  };

  const handleMappingChange = (
    event: SelectChangeEvent<string>,
    dbField: string
  ) => {
    setMappings((prev) => ({ ...prev, [dbField]: event.target.value }));
  };

  const handleImport = async () => {
    toast.loading("Importing data...");
    try {
      const result = await importProducts({ filePath, mappings });
      toast.dismiss();
      toast.success(result.message);
      onClose(true); // Close modal and signal a refresh
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Import failed.");
    }
  };

  const resetStateAndClose = () => {
    setActiveStep(0);
    setFilePath("");
    setFileHeaders([]);
    setPreviewData([]);
    setMappings({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={resetStateAndClose} fullWidth maxWidth="lg">
      <DialogTitle>Import Products from Excel</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* --- Step 1: Upload --- */}
        {activeStep === 0 && (
          <Box textAlign="center" p={5}>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={handleFileSelect}
            >
              Select Excel File
            </Button>
            <Typography variant="caption" display="block" mt={2}>
              Supported formats: .xlsx, .xls, .csv
            </Typography>
          </Box>
        )}

        {/* --- Step 2: Map Columns --- */}
        {activeStep === 1 && (
          <Box>
            <Typography gutterBottom>
              Match your Excel columns to the required database fields.
            </Typography>
            <Grid container spacing={2} mt={1}>
              {requiredDbFields.map((dbField) => (
                <Grid item xs={12} sm={6} md={3} key={dbField}>
                  <FormControl fullWidth size="small">
                    <InputLabel>
                      {dbField
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </InputLabel>
                    <Select
                      value={mappings[dbField] || ""}
                      onChange={(e) => handleMappingChange(e, dbField)}
                      label={dbField.replace(/_/g, " ")}
                    >
                      <MenuItem value="">
                        <em>-- Do not import --</em>
                      </MenuItem>
                      {fileHeaders.map((header) => (
                        <MenuItem key={header} value={header}>
                          {header}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* --- Step 3: Preview --- */}
        {activeStep === 2 && (
          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(mappings).map((key) => (
                    <TableCell key={key} sx={{ fontWeight: "bold" }}>
                      {key}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {Object.keys(mappings).map((dbField) => (
                      <TableCell key={dbField}>
                        {row[mappings[dbField]] || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={resetStateAndClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep((s) => s - 1)}>Back</Button>
        )}
        {activeStep < 2 && activeStep > 0 && (
          <Button
            variant="contained"
            onClick={() => setActiveStep((s) => s + 1)}
          >
            Next
          </Button>
        )}
        {activeStep === 2 && (
          <Button variant="contained" color="success" onClick={handleImport}>
            Confirm & Import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
