import { Box, useTheme, Typography, alpha } from "@mui/material";
import { keyframes } from "@emotion/react";

// --- ANIMATIONS ---

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
`;

const shadowPulse = keyframes`
  0%, 100% { opacity: 0.15; transform: scale(0.8) rotateX(70deg); }
  50% { opacity: 0.4; transform: scale(1.2) rotateX(70deg); }
`;

const expandTop = keyframes`
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(0, -18px); }
`;

const expandLeft = keyframes`
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-15.5px, 9px); }
`;

const expandRight = keyframes`
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(15.5px, 9px); }
`;

const corePulse = keyframes`
  0%, 100% { transform: scale(0.7); opacity: 0.4; }
  50% { transform: scale(1.3); opacity: 1; }
`;

const textPulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

export default function KoshBusinessLoader({ size = 120 }: { size?: number }) {
  const theme = useTheme();
  
  // Theme colors matching Kosh aesthetics
  const primary = theme.palette.primary.main;
  const primaryLight = theme.palette.primary.light || "#4b9afa";
  const primaryDark = theme.palette.primary.dark || "#0a4b9c";
  const secondary = theme.palette.secondary.main || "#f59e0b";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: size * 1.5,
        p: 2,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1,
        }}
      >
        {/* Floor Shadow */}
        <Box
          sx={{
            position: "absolute",
            width: size * 0.7,
            height: size * 0.7,
            background: `radial-gradient(circle, ${alpha(primaryDark, 1)} 0%, transparent 60%)`,
            animation: `${shadowPulse} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            bottom: -size * 0.2,
            zIndex: 0,
          }}
        />

        {/* Animated Floating Cube */}
        <Box
          sx={{
            width: "100%",
            height: "100%",
            animation: `${float} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
            zIndex: 1,
          }}
        >
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
          >
            <g transform="translate(50, 50)">
              {/* Inner Glowing Core (Treasure/Data) - Blur Layer */}
              <circle
                cx="0"
                cy="0"
                r="16"
                fill={secondary}
                style={{
                  animation: `${corePulse} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                  filter: "blur(6px)",
                  opacity: 0.8
                }}
              />
              {/* Inner Glowing Core - Solid Layer */}
              <circle
                cx="0"
                cy="0"
                r="10"
                fill={secondary}
                style={{
                  animation: `${corePulse} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                }}
              />

              {/* Top Face */}
              <polygon
                points="0,-30 25.98,-15 0,0 -25.98,-15"
                fill={primaryLight}
                stroke={primaryLight}
                strokeWidth="0.5"
                style={{ animation: `${expandTop} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite` }}
              />
              {/* Left Face */}
              <polygon
                points="-25.98,-15 0,0 0,30 -25.98,15"
                fill={primary}
                stroke={primary}
                strokeWidth="0.5"
                style={{ animation: `${expandLeft} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite` }}
              />
              {/* Right Face */}
              <polygon
                points="0,0 25.98,-15 25.98,15 0,30"
                fill={primaryDark}
                stroke={primaryDark}
                strokeWidth="0.5"
                style={{ animation: `${expandRight} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite` }}
              />
            </g>
          </svg>
        </Box>
      </Box>

      {/* Loading Text */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            background: `linear-gradient(90deg, ${primary}, ${secondary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 4,
            mb: 0.5,
            fontFamily: "'Nunito', 'Plus Jakarta Sans', sans-serif"
          }}
        >
          KOSH
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 700,
            animation: `${textPulse} 1.5s ease-in-out infinite`,
          }}
        >
          Loading Workspace
        </Typography>
      </Box>
    </Box>
  );
}
