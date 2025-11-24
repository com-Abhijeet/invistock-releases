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
// ✅ Import the new customer service function
import { importCustomers } from "../../lib/api/customerService";

const { ipcRenderer } = window.electron;

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

const steps = ["Upload File", "Map Columns", "Preview & Import"];

// ✅ These are the fields for a new customer in your database.
const dbFields = [
  "name",
  "phone",
  "address",
  "city",
  "state",
  "pincode",
  "gst_no",
  "credit_limit",
  "additional_info",
];

export default function CustomerImportModal({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [filePath, setFilePath] = useState("");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const handleFileSelect = async () => {
    // This function is generic and remains largely unchanged
    if (!ipcRenderer) return toast.error("Desktop features not available.");
    const selectedPath = await ipcRenderer.invoke("dialog:open-file", {
      /* ... */
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
        // Auto-mapping logic
        const initialMappings: Record<string, string> = {};
        dbFields.forEach((dbField) => {
          const foundHeader = fileData.headers.find(
            (h: string) =>
              h.toLowerCase().replace(/[\s_]/g, "") ===
              dbField.toLowerCase().replace(/[\s_]/g, "")
          );
          if (foundHeader) initialMappings[dbField] = foundHeader;
        });
        setMappings(initialMappings);
        setActiveStep(1);
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
    toast.loading("Importing customers...");
    try {
      // ✅ Call the new importCustomers function
      const result = await importCustomers({ filePath, mappings });
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
      <DialogTitle>Import Customers from Excel</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

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

        {activeStep === 1 && (
          <Box>
            <Typography gutterBottom>
              Match your Excel columns to the database fields.
            </Typography>
            <Grid container spacing={2} mt={1}>
              {/* ✅ Mapped to customer fields */}
              {dbFields.map((dbField) => (
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
