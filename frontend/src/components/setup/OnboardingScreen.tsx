import { Box, Typography, Stack, Container } from "@mui/material";
import { Phone, Mail } from "lucide-react";
import ShopSetupWizard from "./ShopSetupWizard"; // Adjust path if needed
import Grid from "@mui/material/GridLegacy";
export default function OnboardingScreen({
  onSetupComplete,
}: {
  onSetupComplete: () => void;
}) {
  return (
    <Grid container sx={{ minHeight: "95vh", bgcolor: "background.paper" }}>
      {/* LEFT COLUMN: Branding & Info */}
      <Grid
        item
        xs={12}
        md={4}
        sx={{
          bgcolor: "primary.main",
          color: "primary.contrastText",
          p: { xs: 4, md: 6 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={4}>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: "white",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src="/icon.png"
                alt="App Logo"
                style={{ width: "32px", height: "32px", objectFit: "contain" }}
              />
            </Box>
            <Typography variant="h5" fontWeight={800} letterSpacing={1}>
              KOSH - Inventory & Billing
            </Typography>
          </Box>

          <Typography variant="h3" fontWeight={700} gutterBottom sx={{ mt: 8 }}>
            Let's get your business running.
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
            Setup your shop profile, tax details, and preferences in a few
            simple steps.
          </Typography>
        </Box>

        {/* Contact Info Footer */}
        <Box sx={{ mt: 8, opacity: 0.8 }}>
          <Typography variant="overline" fontWeight="bold" letterSpacing={1}>
            NEED HELP?
          </Typography>
          <Stack spacing={2} mt={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Phone size={18} />
              <Typography variant="body2">+91 81809 04072</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Mail size={18} />
              <Typography variant="body2">invistock@gmail.com</Typography>
            </Box>
            {/* <Box display="flex" alignItems="center" gap={2}>
              <Globe size={18} />
              <Typography variant="body2">www.inventorypos.com</Typography>
            </Box> */}
          </Stack>
        </Box>
      </Grid>

      {/* RIGHT COLUMN: Wizard Steps */}
      <Grid
        item
        xs={12}
        md={8}
        display="flex"
        flexDirection="column"
        justifyContent="center"
        sx={{ bgcolor: "#fafafa" }} // Light gray bg for contrast
      >
        <Container maxWidth="md">
          <ShopSetupWizard onSuccess={onSetupComplete} />
        </Container>
      </Grid>
    </Grid>
  );
}
