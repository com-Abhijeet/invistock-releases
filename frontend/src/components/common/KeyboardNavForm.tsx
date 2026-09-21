import React, { useRef, useEffect } from "react";
import { Box, BoxProps } from "@mui/material";

export interface KeyboardNavFormProps extends Omit<BoxProps, "onSubmit"> {
  children: React.ReactNode;
  /** Callback fired when Ctrl+S or Cmd+S is pressed, or when Enter is pressed on the submit button */
  onSave?: (e?: React.FormEvent | React.KeyboardEvent) => void;
  /** Standard form onSubmit handler */
  onSubmit?: (e: React.FormEvent) => void;
  /** Disables Enter-as-Tab key progression */
  disableEnterAsTab?: boolean;
  /** Disables Ctrl+S / Cmd+S save shortcut */
  disableCtrlS?: boolean;
  /** Auto-focuses the first valid input when the form mounts */
  autoFocusFirst?: boolean;
  /** HTML component to render as container (default: 'form') */
  component?: React.ElementType;
}

/**
 * KeyboardNavForm
 * Scoped container providing standard enterprise keyboard navigation:
 * - Enter moves to next input (Shift+Enter moves to previous)
 * - Safe against Textareas (allows line breaks)
 * - Safe against open dropdowns/menus (lets user pick from list)
 * - Ctrl+S / Cmd+S triggers save/submit preventing browser "Save Page" dialog
 */
export default function KeyboardNavForm({
  children,
  onSave,
  onSubmit,
  disableEnterAsTab = false,
  disableCtrlS = false,
  autoFocusFirst = false,
  component = "form",
  sx,
  ...rest
}: KeyboardNavFormProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus first input on mount if requested
  useEffect(() => {
    if (autoFocusFirst && containerRef.current) {
      const timer = setTimeout(() => {
        const firstInput = containerRef.current?.querySelector<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"])',
        );
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocusFirst]);

  // Window-level Ctrl+S capture to reliably catch save shortcut anywhere while form is active
  useEffect(() => {
    if (disableCtrlS) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        if (!containerRef.current) return;
        if (!document.body.contains(containerRef.current)) return;

        e.preventDefault();
        e.stopPropagation();

        if (onSave) {
          onSave(e as any);
        } else if (onSubmit && component === "form") {
          const formEl = containerRef.current as unknown as HTMLFormElement;
          if (formEl && typeof formEl.requestSubmit === "function") {
            formEl.requestSubmit();
          } else {
            onSubmit(e as any);
          }
        } else {
          const submitBtn = containerRef.current?.querySelector<HTMLButtonElement>(
            'button[type="submit"], button[data-save="true"]',
          );
          submitBtn?.click();
        }
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown, { capture: true });
    };
  }, [disableCtrlS, onSave, onSubmit, component]);

  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.current) return [];
    const selector = [
      'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      '[tabindex="0"]:not([disabled])',
    ].join(", ");

    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(selector),
    );

    // Filter out invisible elements or those explicitly marked to skip navigation
    return elements.filter((el) => {
      if (el.getAttribute("data-nav-skip") === "true") return false;
      // Check if element is visible
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Handle Ctrl+S / Cmd+S (Save shortcut)
    if (!disableCtrlS && (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      e.stopPropagation();

      if (onSave) {
        onSave(e);
      } else if (onSubmit && component === "form") {
        const formEl = containerRef.current as unknown as HTMLFormElement;
        if (formEl && typeof formEl.requestSubmit === "function") {
          formEl.requestSubmit();
        } else {
          onSubmit(e as unknown as React.FormEvent);
        }
      } else {
        // Find submit button and trigger click
        const submitBtn = containerRef.current?.querySelector<HTMLButtonElement>(
          'button[type="submit"], button[data-save="true"]',
        );
        submitBtn?.click();
      }
      return;
    }

    if (disableEnterAsTab || e.defaultPrevented) {
      return;
    }

    const target = e.target as HTMLElement;
    if (!target) return;

    // Safeguard B: Allow native newline behavior in multiline textareas
    if (target.tagName === "TEXTAREA") {
      return;
    }

    // Safeguard C: Let native buttons execute their onClick (e.g. Cancel button)
    if (target.tagName === "BUTTON") {
      return;
    }

    // Safeguard D: If a dropdown, autocomplete, or popup menu is currently open, do not hijack Enter/Backspace
    const isExpanded = target.getAttribute("aria-expanded") === "true";
    const hasCustomNav = target.getAttribute("data-custom-nav") === "true";
    if (isExpanded || hasCustomNav) {
      return;
    }

    // Also check if any active popper / menu is open on screen
    const openMenu = document.querySelector(
      '.MuiMenu-paper:not([style*="visibility: hidden"]), .MuiAutocomplete-popper, [role="listbox"]:not([style*="display: none"])',
    );
    if (openMenu) {
      return;
    }

    // 2. Handle Enter-as-Tab navigation
    if (e.key === "Enter") {
      const focusables = getFocusableElements();
      if (!focusables.length) return;

      // Find index of active element or its closest focusable parent
      const currentIndex = focusables.findIndex(
        (el) => el === target || el.contains(target),
      );

      if (currentIndex === -1) return;

      e.preventDefault();

      if (e.shiftKey) {
        // Move backwards
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          focusables[prevIndex].focus();
        }
      } else {
        // Move forwards
        const nextIndex = currentIndex + 1;
        if (nextIndex < focusables.length) {
          const nextEl = focusables[nextIndex];
          nextEl.focus();
        } else {
          // Reached end of form: trigger onSave/submit
          if (onSave) {
            onSave(e);
          } else {
            const submitBtn = containerRef.current?.querySelector<HTMLButtonElement>(
              'button[type="submit"], button[data-save="true"]',
            );
            if (submitBtn) {
              submitBtn.click();
            }
          }
        }
      }
      return;
    }

    // 3. Handle Backspace on empty field to move to previous input
    if (e.key === "Backspace") {
      const inputTarget = target as HTMLInputElement;
      const isSelect = inputTarget.tagName === "SELECT";
      const isEmpty = isSelect || !inputTarget.value || String(inputTarget.value).trim() === "";

      if (isEmpty) {
        const focusables = getFocusableElements();
        if (!focusables.length) return;

        const currentIndex = focusables.findIndex(
          (el) => el === target || el.contains(target),
        );

        if (currentIndex > 0) {
          e.preventDefault();
          focusables[currentIndex - 1].focus();
        }
      }
      return;
    }
  };

  return (
    <Box
      ref={containerRef}
      data-keyboard-nav="true"
      component={component}
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}
