import { Box, Typography, Paper } from "@mui/material";
import { XCircle } from "lucide-react";

export default function ClientAccessDenied() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{ p: 3, pt: 10 }}
    >
      <Paper
        variant="outlined"
        sx={{ p: 4, maxWidth: 500, textAlign: "center" }}
      >
        <XCircle size={48} color="red" />
        <Typography variant="h5" fontWeight="bold" mt={2}>
          Access Denied
        </Typography>
        <Typography color="text.secondary" mt={1}>
          This page is only available in Admin (Server) mode. Companion apps do
          not have permission to access this section.
        </Typography>
      </Paper>
    </Box>
  );
}
