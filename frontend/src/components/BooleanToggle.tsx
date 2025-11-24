"use client";

import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

interface BooleanToggleProps {
  /** The current boolean value of the toggle. */
  value: boolean;
  /** Callback function that receives the new boolean value. */
  onChange: (newValue: boolean) => void;
  /** Optional label for the 'true' side. Defaults to "Yes". */
  trueLabel?: string;
  /** Optional label for the 'false' side. Defaults to "No". */
  falseLabel?: string;
  /** Optional prop to disable the control. */
  disabled?: boolean;
}

export default function BooleanToggle({
  value,
  onChange,
  trueLabel = "Yes",
  falseLabel = "No",
  disabled = false,
}: BooleanToggleProps) {
  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: boolean | null
  ) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      disabled={disabled}
      aria-label="boolean toggle"
      sx={{
        position: "relative",
        backgroundColor: "grey.100",
        borderRadius: "8px",
        p: 0.5,
        border: "none",
        "& .MuiToggleButtonGroup-grouped": {
          border: 0,
          "&.Mui-disabled": { border: 0 },
        },
        height: "5vh",
      }}
    >
      {/* The Animated Sliding "Thumb" */}
      <Box
        sx={{
          position: "absolute",
          top: "4px",
          left: "4px",
          height: "calc(100% - 8px)",
          width: "calc(50% - 4px)",
          backgroundColor: "primary.main",
          borderRadius: "6px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          zIndex: 1,
          transform: value ? "translateX(100%)" : "translateX(0)",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />

      {/* The Buttons */}
      <ToggleButton
        value={false}
        aria-label="false"
        disableRipple
        sx={{
          textTransform: "none",
          px: 3,
          zIndex: 2,
          "&.Mui-selected": {
            backgroundColor: "transparent",
            "&:hover": { backgroundColor: "transparent" },
          },
          color: value ? "text.primary" : "#fff",
          transition: "color 0.3s ease-in-out",
        }}
      >
        <Typography variant="button" fontWeight={600}>
          {falseLabel}
        </Typography>
      </ToggleButton>

      <ToggleButton
        value={true}
        aria-label="true"
        disableRipple
        sx={{
          textTransform: "none",
          px: 3,
          zIndex: 2,
          "&.Mui-selected": {
            backgroundColor: "transparent",
            "&:hover": { backgroundColor: "transparent" },
          },
          color: value ? "#fff" : "text.primary",
          transition: "color 0.3s ease-in-out",
          // ✅ Centering styles added
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="button" fontWeight={600}>
          {trueLabel}
        </Typography>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
