import { Box, useTheme, Typography } from "@mui/material";
import { keyframes } from "@emotion/react";

// --- ANIMATIONS ---

// 1. Truck Entry & Exit
const truckAnim = keyframes`
  0% { transform: translateX(-60px); opacity: 0; }
  10% { transform: translateX(0); opacity: 1; }
  30% { transform: translateX(0); opacity: 1; }
  40% { transform: translateX(60px); opacity: 0; }
  100% { transform: translateX(60px); opacity: 0; }
`;

// 2. Stock Appearance (Box drops in)
const stockAnim = keyframes`
  0%, 30% { transform: scale(0); opacity: 0; }
  35% { transform: scale(1.1); opacity: 1; }
  40% { transform: scale(1); opacity: 1; }
  60% { transform: scale(1); opacity: 1; }
  65% { transform: scale(0); opacity: 0; }
  100% { transform: scale(0); opacity: 0; }
`;

// 3. Sale/Money Exit
const saleAnim = keyframes`
  0%, 60% { transform: translateX(0) scale(0.5); opacity: 0; }
  65% { transform: translateX(0) scale(1.1); opacity: 1; }
  70% { transform: translateX(0) scale(1); opacity: 1; }
  90% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(60px); opacity: 0; }
`;

// 4. Text Fader
const textFade1 = keyframes`0%, 30% { opacity: 1; } 35%, 100% { opacity: 0; }`;
const textFade2 = keyframes`0%, 30% { opacity: 0; } 35%, 60% { opacity: 1; } 65%, 100% { opacity: 0; }`;
const textFade3 = keyframes`0%, 60% { opacity: 0; } 65%, 95% { opacity: 1; } 100% { opacity: 0; }`;

export default function KoshBusinessLoader({ size = 80 }: { size?: number }) {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const accentColor =
    theme.palette.secondary.main || theme.palette.success.main;
  const iconSize = size * 0.5;

  // Total cycle duration
  const duration = "4s";

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: "12px",
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: "white",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* --- ICONS --- */}
      <Box
        sx={{ position: "relative", width: iconSize, height: iconSize, mb: 1 }}
      >
        {/* 1. TRUCK (Inbound) */}
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            animation: `${truckAnim} ${duration} ease-in-out infinite`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </Box>

        {/* 2. BOX (Stock) */}
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            animation: `${stockAnim} ${duration} ease-in-out infinite`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        </Box>

        {/* 3. SHOPPING BAG (Sold) */}
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            animation: `${saleAnim} ${duration} ease-in-out infinite`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
            <path d="M3 6h18"></path>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </Box>
      </Box>

      {/* --- LABELS --- */}
      <Box
        sx={{
          position: "relative",
          height: "1.2em",
          width: "100%",
          textAlign: "center",
        }}
      >
        <Typography
          variant="caption"
          fontWeight="bold"
          color="text.secondary"
          sx={{
            position: "absolute",
            width: "100%",
            left: 0,
            animation: `${textFade1} ${duration} linear infinite`,
          }}
        >
          Purchase
        </Typography>
        <Typography
          variant="caption"
          fontWeight="bold"
          color="primary"
          sx={{
            position: "absolute",
            width: "100%",
            left: 0,
            opacity: 0,
            animation: `${textFade2} ${duration} linear infinite`,
          }}
        >
          Inventory
        </Typography>
        <Typography
          variant="caption"
          fontWeight="bold"
          color="success.main"
          sx={{
            position: "absolute",
            width: "100%",
            left: 0,
            opacity: 0,
            animation: `${textFade3} ${duration} linear infinite`,
          }}
        >
          Sale
        </Typography>
      </Box>
    </Box>
  );
}
