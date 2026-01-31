"use client";

import React, { useEffect, useMemo } from "react";
import {
  Button,
  ButtonProps,
  useTheme,
  Tooltip,
  Box,
  SxProps,
  Theme,
} from "@mui/material";

type KbdVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";

interface KbdButtonProps extends Omit<ButtonProps, "variant"> {
  /** The 5 custom variants requested */
  variant?: KbdVariant;
  /** Keyboard shortcut string e.g., "ctrl+s", "alt+i", "escape" */
  shortcut?: string;
  /** The specific character within the label to underline */
  underlineChar?: string;
  /** The text label of the button */
  label: string;
}

const KbdButton: React.FC<KbdButtonProps> = ({
  variant = "secondary",
  shortcut,
  underlineChar,
  label,
  onClick,
  disabled,
  sx,
  ...props
}) => {
  const theme = useTheme();

  // 1. Global Keyboard Shortcut Logic
  useEffect(() => {
    if (!shortcut || disabled || !onClick) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const keys = shortcut.toLowerCase().split("+");
      const keyTarget = keys.pop(); // The main key (e.g., 's')

      const ctrlRequired = keys.includes("ctrl") || keys.includes("meta");
      const altRequired = keys.includes("alt");
      const shiftRequired = keys.includes("shift");

      const matchesCtrl = ctrlRequired
        ? event.ctrlKey || event.metaKey
        : !(event.ctrlKey || event.metaKey);
      const matchesAlt = altRequired ? event.altKey : !event.altKey;
      const matchesShift = shiftRequired ? event.shiftKey : !event.shiftKey;
      const matchesKey =
        event.key.toLowerCase() === keyTarget ||
        event.code.toLowerCase() === `key${keyTarget}`;

      // Special case for single keys like "escape" or "enter"
      if (shortcut.toLowerCase() === "escape" && event.key === "Escape") {
        event.preventDefault();
        (onClick as any)(event);
        return;
      }

      if (matchesCtrl && matchesAlt && matchesShift && matchesKey) {
        event.preventDefault();
        (onClick as any)(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcut, disabled, onClick]);

  // 2. Label Underlining Logic
  const renderedLabel = useMemo(() => {
    if (!underlineChar) return label;

    const charIndex = label.toLowerCase().indexOf(underlineChar.toLowerCase());
    if (charIndex === -1) return label;

    return (
      <>
        {label.substring(0, charIndex)}
        <span style={{ textDecoration: "underline" }}>
          {label.charAt(charIndex)}
        </span>
        {label.substring(charIndex + 1)}
      </>
    );
  }, [label, underlineChar]);

  // 3. Variant Styling - Explicitly typed as SxProps<Theme> to resolve the TS error
  const variantStyles: SxProps<Theme> = useMemo(() => {
    const base: SxProps<Theme> = {
      borderRadius: "12px",
      textTransform: "none",
      fontWeight: 600,
      px: 2,
      py: 0.8,
      transition: "all 0.2s ease",
    };

    switch (variant) {
      case "primary":
        return {
          ...base,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          boxShadow: theme.shadows[2],
          "&:hover": {
            backgroundColor: theme.palette.primary.dark,
            boxShadow: theme.shadows[4],
          },
        };
      case "secondary":
        return {
          ...base,
          border: "1px solid",
          borderColor: theme.palette.divider,
          color: theme.palette.text.secondary,
          backgroundColor: "transparent",
          "&:hover": {
            borderColor: theme.palette.text.primary,
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.action.hover,
          },
        };
      case "tertiary":
        return {
          ...base,
          backgroundColor: theme.palette.action.selected,
          color: theme.palette.text.primary,
          "&:hover": {
            backgroundColor: theme.palette.action.focus,
          },
        };
      case "ghost":
        return {
          ...base,
          backgroundColor: "transparent",
          color: theme.palette.text.secondary,
          "&:hover": {
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.action.hover,
          },
        };
      case "danger":
        return {
          ...base,
          color: theme.palette.error.main,
          "&:hover": {
            backgroundColor: theme.palette.error.light,
          },
        };
      default:
        return base;
    }
  }, [variant, theme]);

  const buttonContent = (
    <Button
      onClick={onClick}
      disabled={disabled}
      sx={{ ...variantStyles, ...sx }}
      {...props}
    >
      {renderedLabel}
    </Button>
  );

  return shortcut ? (
    <Tooltip title={`Shortcut: ${shortcut.toUpperCase()}`} arrow>
      <Box component="span">{buttonContent}</Box>
    </Tooltip>
  ) : (
    buttonContent
  );
};

export default KbdButton;
