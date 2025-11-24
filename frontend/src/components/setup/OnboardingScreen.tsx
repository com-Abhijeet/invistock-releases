import { Button, Typography, Box } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useState } from "react";
import ShopSetupModal from "./ShopSetupModal";

export default function OnboardingScreen({
  onSetupComplete,
}: {
  onSetupComplete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      flexDirection="column"
    >
      <StorefrontIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Welcome to Your Inventory System
      </Typography>
      <Typography
        color="text.secondary"
        mb={3}
        maxWidth={400}
        textAlign="center"
      >
        Let's begin by registering your shop details and basic setup.
      </Typography>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Register Shop
      </Button>

      <ShopSetupModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onSetupComplete}
      />
    </Box>
  );
}
