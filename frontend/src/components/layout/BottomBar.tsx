import { Box, Typography, useTheme } from "@mui/material";

export default function BottomBar() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2,
        py: 1,
        backgroundColor: "transparent",
        color: theme.palette.grey[600],
        fontSize: "0.85rem",
        borderTop: `1px solid ${theme.palette.divider}`,
        mt: 4,
      }}
    >
      <Typography variant="body2">License: ABC-123-XYZ</Typography>
      <Typography variant="body2" textAlign="center">
        Developer:{" "}
        <a
          href="mailto:invistock@gmail.com"
          style={{ color: theme.palette.grey[600], textDecoration: "none" }}
        >
          invistock@gmail.com
        </a>
      </Typography>
      <Typography variant="body2">Days Left: 28</Typography>
    </Box>
  );
}
