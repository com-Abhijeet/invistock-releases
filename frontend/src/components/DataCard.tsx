import { Paper, Typography, Box } from "@mui/material";

export const DataCard = ({ title, value, subtext, icon, color }: any) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      border: "1px solid #eee",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="start">
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          textTransform="uppercase"
        >
          {title}
        </Typography>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ my: 0.5, color: color || "text.primary" }}
        >
          {value}
        </Typography>
      </Box>
      <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}15`, color: color }}>
        {icon}
      </Box>
    </Box>
    {subtext && (
      <Typography variant="caption" color="text.secondary">
        {subtext}
      </Typography>
    )}
  </Paper>
);
