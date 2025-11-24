import { Typography, Box } from "@mui/material";

export const FormField = ({
  label,
  children,
  charCount,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  charCount?: { current: number; max: number };
}) => (
  <Box>
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 0.5,
      }}
    >
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: "text.secondary" }}
      >
        {label}
      </Typography>
      {charCount && (
        <Typography variant="caption" color="text.secondary">
          {charCount.current} / {charCount.max}
        </Typography>
      )}
    </Box>
    {children}
  </Box>
);
