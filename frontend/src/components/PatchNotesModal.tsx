/**
 * DEVELOPER INSTRUCTIONS FOR APP RELEASES:
 * ============================================================================
 * PLEASE UPDATE THIS FILE ON EVERY APP VERSION RELEASE!
 * ============================================================================
 * This modal displays user-facing patch notes for shop owners and staff.
 *
 * IMPORTANT RULES FOR WRITING NOTES:
 * 1. DO NOT use technical jargon (e.g. no terms like 'state', 'props', 'endpoints',
 *    'SQL', 'APIs', 'debouncing', 'refetching', or 'components').
 * 2. Focus strictly on user benefits:
 *    - What changed in their daily work.
 *    - What improved in speed or ease of use.
 *    - Step-by-step instructions on how to use new features.
 *
 * HOW TO ADD A NEW RELEASE:
 * 1. Update version in `package.json`.
 * 2. Add a new object at the top of the `USER_PATCH_NOTES` array below.
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Chip,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Sparkles,
  CheckCircle2,
  Zap,
  Wrench,
  ChevronDown,
  X,
  Tag,
  Compass,
} from "lucide-react";
import rootPackageJson from "../../../package.json";

export interface UserReleaseNote {
  version: string;
  date: string;
  title: string;
  isLatest?: boolean;
  howToUse: { title: string; desc: string; shortcut?: string }[];
  whatImproved: string[];
  whatFixed: string[];
}

/**
 * DEVELOPER ACTION REQUIRED ON NEW RELEASE:
 * Add the new version notes at the TOP of this array.
 * Note: The version label displayed in the header automatically pulls from package.json!
 */
export const USER_PATCH_NOTES: UserReleaseNote[] = [
  {
    version: rootPackageJson.version || "2.0.5",
    date: "September 20, 2026",
    title:
      "WhatsApp API Integration, Superfast Keyboard Entry & Tally Navigator",
    isLatest: true,
    howToUse: [
      {
        title: "WhatsApp API & Automated Invoicing",
        desc: "Connect your WhatsApp Business API / Official Gateway in Settings > WhatsApp Hub. Send instant digital PDF bills, payment reminders, and order receipts directly to your customers' WhatsApp automatically when a sale is completed!",
        shortcut: "Press W (WhatsApp Hub)",
      },
      {
        title: "Fast Keyboard Input & Backspace Navigation",
        desc: "Press Enter to move to the next input box. Press Shift + Enter to go back to the previous input box. If an input box is empty, pressing Backspace automatically jumps focus back to the previous field.",
        shortcut: "Enter / Shift+Enter / Backspace",
      },
      {
        title: "Gateway of KOSH (Tally Keyboard Navigator)",
        desc: "Press G on the About Page, or press Alt + G (or Ctrl + G) anywhere in KOSH to open the Gateway menu. Simply press single highlighted letters (e.g., D for Dashboards, S for Sales, P for Purchase, I for Inventory, A for Accounts, W for WhatsApp) to jump directly to any page in 1 second.",
        shortcut: "Alt + G or G",
      },
      {
        title: "Instant Customer Focus on POS Billing",
        desc: "Whenever you open POS Billing or finish saving an invoice, the cursor automatically starts inside the Customer Name box so you can start typing immediately.",
        shortcut: "Auto-Focused",
      },
      {
        title: "Instant Number Typing (No More '0' Lock)",
        desc: "Number boxes like Rate, Quantity, and MRP no longer get stuck on '0'. Click into any number field or tab into it and type immediately — the box automatically selects for instant overwrite.",
        shortcut: "Direct Typing",
      },
      {
        title: "Smart Purchase Rate & Profit Margin Calculation",
        desc: "When entering Purchase Cost, KOSH keeps your Product MRP fixed and automatically calculates your profit margin percentage so your selling prices stay accurate.",
        shortcut: "Auto-Calculated",
      },
    ],
    whatImproved: [
      "WhatsApp Messaging Hub: Send automated bills, customer ledgers, and payment receipts straight to customer WhatsApp numbers with 1-click.",
      "Live Search while Typing: Searching for suppliers or products by name or barcode now updates live as you type without freezing the screen.",
      "Conflict-Free Shortcuts: All menu shortcuts and Gateway key commands have been streamlined so every keypress goes exactly where you want.",
      "Clear Number Formatting: Numeric input boxes allow smooth backspacing without forcing unwanted zero values back into the field.",
    ],
    whatFixed: [
      "Stable Transaction Viewer: Viewing or editing past transactions no longer clears or erases filled customer or bill details when clicking around the window.",
      "MRP Stability on Cost Change: Entering purchase prices no longer inflates MRP or profit margin percentages into extreme numbers.",
    ],
  },
  {
    version: "2.0.4",
    date: "September 1, 2026",
    title: "POS Billing Speed & Serial Scan Enhancements",
    howToUse: [
      {
        title: "Bulk Serial Number Scanner",
        desc: "In purchase batch entry, you can now paste a list of barcode serial numbers separated by new lines or commas to automatically add multiple items at once.",
        shortcut: "Paste & Sync",
      },
    ],
    whatImproved: [
      "Faster Barcode Scanning: POS checkout screen responds instantly to hardware barcode scanners.",
      "Check Printing Templates: Easily print bank checks with payee names and formatted amounts.",
    ],
    whatFixed: [
      "Tax Rounding Adjustment: Resolved minor tax rounding differences on multi-item billing receipts.",
    ],
  },
  {
    version: "2.0.0",
    date: "August 01, 2026",
    title: "Initial KOSH Business Engine Release",
    howToUse: [
      {
        title: "Complete Billing & Inventory Suite",
        desc: "Manage POS invoicing, purchase entry, customer outstanding ledgers, GST reporting, and mobile cloud sync.",
      },
    ],
    whatImproved: [
      "Built for speed and offline-first counter operations across Bharat.",
    ],
    whatFixed: [],
  },
];

interface PatchNotesModalProps {
  open: boolean;
  onClose: () => void;
  currentAppVersion?: string;
}

export default function PatchNotesModal({
  open,
  onClose,
  currentAppVersion = rootPackageJson.version || "2.0.5",
}: PatchNotesModalProps) {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "text.primary",
          color: "white",
          py: 2,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Sparkles size={22} color={theme.palette.secondary.main} />
          <Box>
            <Typography
              variant="h6"
              fontWeight={800}
              color="white"
              lineHeight={1.2}
            >
              What's New in KOSH
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              App Version: <strong>v{currentAppVersion}</strong> (from
              package.json)
            </Typography>
          </Box>
        </Stack>
        <Button
          onClick={onClose}
          sx={{ minWidth: "auto", color: "rgba(255,255,255,0.8)", p: 0.5 }}
        >
          <X size={20} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, bgcolor: "grey.50" }}>
        <Stack spacing={3}>
          {USER_PATCH_NOTES.map((release, idx) => (
            <Accordion
              key={release.version}
              defaultExpanded={idx === 0}
              elevation={0}
              sx={{
                borderRadius: "10px !important",
                border: "1px solid",
                borderColor: release.isLatest ? "primary.main" : "divider",
                bgcolor: "background.paper",
                overflow: "hidden",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ChevronDown size={18} />}
                sx={{
                  bgcolor: release.isLatest
                    ? alpha(theme.palette.primary.main, 0.04)
                    : "background.paper",
                  px: 2.5,
                  py: 1.5,
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  width="100%"
                  spacing={1}
                  pr={1}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Tag size={18} color={theme.palette.primary.main} />
                    <Typography variant="subtitle1" fontWeight={800}>
                      Version {release.version}
                    </Typography>
                    {release.isLatest && (
                      <Chip
                        label="CURRENT VERSION"
                        size="small"
                        color="primary"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          fontWeight: 900,
                        }}
                      />
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    Released: {release.date}
                  </Typography>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 2.5, pb: 3, pt: 1 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  color="text.primary"
                  mb={2}
                >
                  {release.title}
                </Typography>

                {/* How to use new features */}
                {release.howToUse && release.howToUse.length > 0 && (
                  <Box
                    mb={2.5}
                    p={2}
                    borderRadius={2}
                    bgcolor={alpha(theme.palette.primary.main, 0.03)}
                    border={`1px dashed ${alpha(theme.palette.primary.main, 0.2)}`}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      color="primary.main"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      mb={1.5}
                    >
                      <Compass size={14} /> How to Use New Features
                    </Typography>
                    <Stack spacing={1.5}>
                      {release.howToUse.map((item, i) => (
                        <Box key={i}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={0.5}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              color="text.primary"
                            >
                              &bull; {item.title}
                            </Typography>
                            {item.shortcut && (
                              <Chip
                                label={item.shortcut}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.625rem",
                                  fontWeight: 800,
                                  bgcolor: "grey.200",
                                }}
                              />
                            )}
                          </Stack>
                          <Typography
                            variant="body2"
                            fontSize="0.825rem"
                            color="text.secondary"
                            pl={2}
                          >
                            {item.desc}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* What Improved */}
                {release.whatImproved && release.whatImproved.length > 0 && (
                  <Box mb={2}>
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      color="text.primary"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      mb={1}
                    >
                      <Zap size={14} color={theme.palette.primary.main} /> What
                      Improved
                    </Typography>
                    <Stack spacing={0.75} pl={1}>
                      {release.whatImproved.map((imp, i) => (
                        <Stack
                          key={i}
                          direction="row"
                          spacing={1}
                          alignItems="flex-start"
                        >
                          <CheckCircle2
                            size={14}
                            color={theme.palette.success.main}
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <Typography
                            variant="body2"
                            fontSize="0.825rem"
                            color="text.secondary"
                          >
                            {imp}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* What Fixed */}
                {release.whatFixed && release.whatFixed.length > 0 && (
                  <Box>
                    <Typography
                      variant="caption"
                      fontWeight={900}
                      color="text.primary"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      mb={1}
                    >
                      <Wrench size={14} color={theme.palette.primary.main} />{" "}
                      What Was Fixed
                    </Typography>
                    <Stack spacing={0.75} pl={1}>
                      {release.whatFixed.map((fix, i) => (
                        <Stack
                          key={i}
                          direction="row"
                          spacing={1}
                          alignItems="flex-start"
                        >
                          <CheckCircle2
                            size={14}
                            color={theme.palette.info.main}
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <Typography
                            variant="body2"
                            fontSize="0.825rem"
                            color="text.secondary"
                          >
                            {fix}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          justifyContent: "space-between",
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontStyle="italic"
        ></Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={onClose}
          sx={{ fontWeight: 800 }}
        >
          Got It
        </Button>
      </DialogActions>
    </Dialog>
  );
}
