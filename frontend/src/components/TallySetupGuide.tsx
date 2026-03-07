import React, { useState } from "react";
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

const LEDGERS = [
  {
    name: "Sales Account",
    group: "Sales Accounts",
    purpose: "Tracks core revenue",
  },
  {
    name: "Purchase Account",
    group: "Purchase Accounts",
    purpose: "Tracks core expenses",
  },
  {
    name: "Bank Account",
    group: "Bank Accounts",
    purpose: "Tracks UPI/Card/Bank payments",
  },
  { name: "CGST", group: "Duties & Taxes (Type: GST)", purpose: "Central GST" },
  { name: "SGST", group: "Duties & Taxes (Type: GST)", purpose: "State GST" },
  {
    name: "IGST",
    group: "Duties & Taxes (Type: GST)",
    purpose: "Integrated GST",
  },
  {
    name: "Discount Allow",
    group: "Indirect Expenses",
    purpose: "Discounts given to customers",
  },
  {
    name: "Round Off",
    group: "Indirect Expenses",
    purpose: "Absorbs fractional 0.01 differences",
  },
];

export default function TallySetupGuide() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);
  const handleReset = () => setActiveStep(0);

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 2 }}>
      <Box mb={4}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Kosh-to-Tally Connection Guide
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Follow these steps carefully to ensure your Kosh Billing data flows
          seamlessly into Tally Prime / Tally ERP 9 without any rejection
          errors.
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} orientation="vertical">
        {/* STEP 1 */}
        <Step>
          <StepLabel
            sx={{
              "& .MuiStepLabel-label": {
                fontWeight: "bold",
                fontSize: "1.1rem",
              },
            }}
          >
            Create Core Ledgers in Tally
          </StepLabel>
          <StepContent>
            <Typography variant="body2" mb={2}>
              Our Sync Engine automatically creates your Customers and
              Suppliers. However, you MUST manually create the core accounting
              ledgers in Tally first.
              <br />
              <br />
              In Tally, go to:{" "}
              <strong>Gateway of Tally &gt; Create &gt; Ledger</strong>
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Ledger Name (Exact Spelling)
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Under Group
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {LEDGERS.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell
                        sx={{ fontWeight: 600, color: "primary.main" }}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell>{row.group}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="info" sx={{ mb: 2 }}>
              Note: "Cash" and "Profit & Loss A/c" ledgers usually exist by
              default in a new Tally company.
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ mt: 1, mr: 1, borderRadius: 2 }}
              >
                Continue
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* STEP 2 */}
        <Step>
          <StepLabel
            sx={{
              "& .MuiStepLabel-label": {
                fontWeight: "bold",
                fontSize: "1.1rem",
              },
            }}
          >
            Map Ledgers in Kosh Settings
          </StepLabel>
          <StepContent>
            <Typography variant="body2" mb={2}>
              Now that your ledgers exist in Tally, switch to the{" "}
              <strong>Ledger Configuration</strong> tab at the top of this
              dashboard.
              <br />
              <br />
              Ensure the names typed in the text boxes perfectly match the
              ledgers you just created in Tally. If you named your ledger "Sales
              A/C" in Tally, it must be exactly "Sales A/C" in Kosh.
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ mt: 1, mr: 1, borderRadius: 2 }}
              >
                Continue
              </Button>
              <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* STEP 3 */}
        <Step>
          <StepLabel
            sx={{
              "& .MuiStepLabel-label": {
                fontWeight: "bold",
                fontSize: "1.1rem",
              },
            }}
          >
            Enable ODBC Server in Tally
          </StepLabel>
          <StepContent>
            <Typography variant="body2" mb={2}>
              Kosh communicates with Tally using its built-in server. You must
              turn this on.
            </Typography>
            <Box
              component="ol"
              sx={{ typography: "body2", pl: 3, mb: 3, "& li": { mb: 1 } }}
            >
              <li>
                In Tally, press <strong>F12 (Configure)</strong> and go to{" "}
                <strong>Advanced Configuration</strong>.
              </li>
              <li>
                Look for <strong>Tally acts as</strong> and set it to{" "}
                <strong>Both</strong>.
              </li>
              <li>
                Set the Port number to <strong>9000</strong>.
              </li>
              <li>
                Restart Tally. You should see <em>"Server with ODBC: 9000"</em>{" "}
                at the bottom of the Tally window.
              </li>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ mt: 1, mr: 1, borderRadius: 2 }}
              >
                Finish Setup
              </Button>
              <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>
      </Stepper>

      {activeStep === 3 && (
        <Paper
          square
          elevation={0}
          sx={{
            p: 3,
            mt: 2,
            bgcolor: theme.palette.success.light + "20",
            borderRadius: 2,
            border: `1px solid ${theme.palette.success.light}`,
          }}
        >
          <Typography fontWeight="bold" color="success.main" gutterBottom>
            Setup Complete! 🎉
          </Typography>
          <Typography variant="body2" mb={2}>
            You are now ready to sync. Go to the{" "}
            <strong>Dashboard & Sync</strong> tab and hit "Run Smart Sync".
          </Typography>
          <Button
            onClick={handleReset}
            variant="outlined"
            color="success"
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Read Guide Again
          </Button>
        </Paper>
      )}

      {/* FAQs Section */}
      <Box mt={6}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Troubleshooting & FAQs
        </Typography>

        <Accordion
          variant="outlined"
          sx={{
            borderRadius: "8px !important",
            mb: 1,
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600} color="error.main">
              Error: Ledger 'Sales Account' does not exist!
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">
              You forgot to create the Sales Account in Tally, or there is a
              spelling mistake. Go to Tally, alter the ledger, and ensure there
              are no hidden spaces at the end of the name.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          variant="outlined"
          sx={{
            borderRadius: "8px !important",
            mb: 1,
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600} color="error.main">
              Error: Voucher date is missing / Date out of range
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">
              Are you using <strong>Tally Educational Mode</strong>? Tally
              Educational Mode restricts you from saving vouchers on any date
              other than the 1st, 2nd, or 31st of the month. Kosh will try to
              force your test dates to the 1st, but you must use a Licensed
              version of Tally for daily records.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion
          variant="outlined"
          sx={{
            borderRadius: "8px !important",
            mb: 1,
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>
              Do I need to create my inventory items in Tally?
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">
              <strong>No!</strong> Kosh uses an "Accounting Voucher" sync. This
              means it only syncs the financial value of the invoice directly
              into your accounting ledgers. This prevents the nightmare of SKU
              mismatches and is exactly what your Chartered Accountant (CA)
              needs for GST filing!
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}
