import { alpha, Typography, Box } from "@mui/material";

export const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      py: 1.25,
      px: 1.5,
      borderRadius: 1.5,
      // "Zebra-striping" for better readability without dividers
      "&:nth-of-type(odd)": {
        backgroundColor: (theme) => alpha(theme.palette.primary.light, 0.5),
      },
    }}
  >
    <Typography
      variant="body2"
      sx={{ color: "text.secondary", fontWeight: 500 }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        color: "text.primary",
        fontWeight: 600,
        textAlign: "right",
        pl: 2,
        wordBreak: "break-word",
      }}
    >
      {value || "—"}
    </Typography>
  </Box>
);
