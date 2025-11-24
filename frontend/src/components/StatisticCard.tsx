import { Box, Paper, Typography } from "@mui/material";
import type { ReactNode } from "react";
import CountUp from "react-countup";

interface Props {
  title: string;
  value: string | number;
  icon: ReactNode;
}

const StatisticCard = ({ title, value, icon }: Props) => {
  const isNumeric =
    typeof value === "number" ||
    (typeof value === "string" &&
      /^\d+(,\d{3})*(\.\d+)?$/.test(value.replace(/₹|,/g, "")));

  const getNumericValue = () => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/₹|,/g, ""); // remove ₹ and commas
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        height: "100%",
      }}
    >
      <Box sx={{ color: "#1976d2", mb: 0.5 }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="subtitle2" fontWeight={600}>
        {isNumeric ? (
          <>
            <CountUp
              end={getNumericValue()}
              duration={1}
              separator=","
              decimals={0}
              preserveValue
            />
          </>
        ) : (
          value
        )}
      </Typography>
    </Paper>
  );
};

export default StatisticCard;
