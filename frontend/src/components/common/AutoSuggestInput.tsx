import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  TextField,
  Popper,
  Paper,
  MenuList,
  MenuItem,
  ListSubheader,
  Typography,
  Box,
  ClickAwayListener,
} from "@mui/material";

export interface AutoSuggestOption {
  id?: number | string;
  name: string;
  code?: string;
  group?: string;
  [key: string]: any;
}

interface AutoSuggestInputProps {
  id?: string;
  label?: React.ReactNode;
  value: number | string | null;
  options: AutoSuggestOption[];
  placeholder?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  variant?: "outlined" | "standard";
  sx?: any;
  inputRef?: (instance: HTMLInputElement | null) => void;
  onSearch?: (query: string) => void;
  onChange: (value: number | string | null) => void;
  onNext?: () => void;
  onPrev?: () => void;
  InputProps?: any;
  error?: boolean;
  helperText?: React.ReactNode;
}

export default function AutoSuggestInput({
  id,
  label,
  value,
  options,
  placeholder = "Select or Type New",
  disabled = false,
  allowCreate = true,
  variant = "outlined",
  sx,
  inputRef: externalInputRef,
  onSearch,
  onChange,
  onNext,
  onPrev,
  InputProps,
  error,
  helperText,
}: AutoSuggestInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const isDeletingRef = useRef(false);
  const ignoreSyncRef = useRef(false);

  // Sync displayed inputValue with external `value` prop
  useEffect(() => {
    if (ignoreSyncRef.current) {
      ignoreSyncRef.current = false;
      return;
    }
    // If menu is open and user is actively typing, do not overwrite inputValue
    if (isOpen && searchQuery !== null) {
      return;
    }
    setSearchQuery(null);
    if (value === null || value === undefined || value === "") {
      setInputValue("");
    } else if (typeof value === "number") {
      const found = options.find((opt) => opt.id === value);
      setInputValue(found ? found.name : String(value));
    } else if (typeof value === "string") {
      const found = options.find(
        (opt) =>
          opt.id === value ||
          (opt.code && opt.code.toLowerCase() === value.trim().toLowerCase()) ||
          opt.name.toLowerCase() === value.trim().toLowerCase(),
      );
      setInputValue(found ? found.name : value);
    }
  }, [value, options]);

  // Combined input ref
  const setCombinedRef = (el: HTMLInputElement | null) => {
    internalInputRef.current = el;
    if (externalInputRef) {
      externalInputRef(el);
    }
  };

  // Filter options based on typed input
  const filteredOptions = useMemo(() => {
    if (searchQuery === null) return options;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;

    const prefixMatches: AutoSuggestOption[] = [];
    const codeMatches: AutoSuggestOption[] = [];
    const otherMatches: AutoSuggestOption[] = [];

    for (const opt of options) {
      const optName = opt.name.toLowerCase();
      const optCode = opt.code ? opt.code.toLowerCase() : "";
      const optId = opt.id !== undefined ? String(opt.id).toLowerCase() : "";

      if (optName.startsWith(query)) {
        prefixMatches.push(opt);
      } else if (optCode.startsWith(query) || optId.startsWith(query)) {
        codeMatches.push(opt);
      } else if (optName.includes(query) || optCode.includes(query)) {
        otherMatches.push(opt);
      }
    }

    return [...prefixMatches, ...codeMatches, ...otherMatches];
  }, [options, searchQuery]);

  // Check if current input is exact match
  const exactMatch = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return null;
    return (
      options.find(
        (opt) =>
          opt.name.toLowerCase() === query ||
          (opt.code && opt.code.toLowerCase() === query) ||
          (opt.id !== undefined && String(opt.id).toLowerCase() === query),
      ) || null
    );
  }, [options, inputValue]);

  // Keep highlighted item in view when navigating with arrow keys
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  const commitValue = (valToCommit: string) => {
    const trimmed = valToCommit.trim();
    if (!trimmed) {
      if (allowCreate) {
        ignoreSyncRef.current = true;
        if (value !== null) onChange(null);
      } else {
        // Rollback to existing value if clearing not allowed
        if (value !== null && value !== undefined) {
          const found = options.find(
            (opt) =>
              opt.id === value ||
              (opt.code &&
                opt.code.toLowerCase() === String(value).toLowerCase()) ||
              opt.name.toLowerCase() === String(value).toLowerCase(),
          );
          setInputValue(found ? found.name : String(value));
        }
      }
      return;
    }

    // Check if it matches an existing option (case-insensitive)
    const matchedOpt = options.find(
      (opt) =>
        opt.name.toLowerCase() === trimmed.toLowerCase() ||
        (opt.code && opt.code.toLowerCase() === trimmed.toLowerCase()) ||
        (opt.id !== undefined &&
          String(opt.id).toLowerCase() === trimmed.toLowerCase()),
    );

    if (matchedOpt) {
      ignoreSyncRef.current = true;
      setInputValue(matchedOpt.name);
      const targetVal = matchedOpt.id !== undefined ? matchedOpt.id : matchedOpt.name;
      if (targetVal !== value) {
        onChange(targetVal);
      }
    } else if (allowCreate) {
      ignoreSyncRef.current = true;
      setInputValue(trimmed);
      if (trimmed !== value) {
        onChange(trimmed);
      }
    } else {
      // Creation not allowed: rollback to previous valid selection
      if (value !== null && value !== undefined) {
        const found = options.find(
          (opt) =>
            opt.id === value ||
            (opt.code &&
              opt.code.toLowerCase() === String(value).toLowerCase()) ||
            opt.name.toLowerCase() === String(value).toLowerCase(),
        );
        setInputValue(found ? found.name : String(value));
      } else if (options.length > 0) {
        setInputValue(options[0].name);
        const fallbackVal = options[0].id !== undefined ? options[0].id : options[0].name;
        if (fallbackVal !== value) {
          onChange(fallbackVal);
        }
      }
    }
  };

  const focusNextElement = () => {
    if (onNext) {
      setTimeout(() => onNext(), 50);
      return;
    }
    setTimeout(() => {
      const root = internalInputRef.current?.closest(
        'form, [data-keyboard-nav="true"], [role="dialog"], body',
      );
      if (!root || !internalInputRef.current) return;

      const selector = [
        'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
        'select:not([disabled]):not([tabindex="-1"])',
        'textarea:not([disabled]):not([tabindex="-1"])',
        'button:not([disabled]):not([tabindex="-1"]):not([data-nav-skip="true"])',
      ].join(", ");

      const elements = Array.from(
        root.querySelectorAll<HTMLElement>(selector),
      ).filter(
        (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      );

      const currentIndex = elements.indexOf(internalInputRef.current);
      if (currentIndex !== -1 && currentIndex < elements.length - 1) {
        elements[currentIndex + 1].focus();
      }
    }, 50);
  };

  const focusPrevElement = () => {
    if (onPrev) {
      setTimeout(() => onPrev(), 50);
      return;
    }
    setTimeout(() => {
      const root = internalInputRef.current?.closest(
        'form, [data-keyboard-nav="true"], [role="dialog"], body',
      );
      if (!root || !internalInputRef.current) return;

      const selector = [
        'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
        'select:not([disabled]):not([tabindex="-1"])',
        'textarea:not([disabled]):not([tabindex="-1"])',
        'button:not([disabled]):not([tabindex="-1"]):not([data-nav-skip="true"])',
      ].join(", ");

      const elements = Array.from(
        root.querySelectorAll<HTMLElement>(selector),
      ).filter(
        (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      );

      const currentIndex = elements.indexOf(internalInputRef.current);
      if (currentIndex > 0) {
        elements[currentIndex - 1].focus();
      }
    }, 50);
  };

  const handleSelectOption = (opt: AutoSuggestOption) => {
    setInputValue(opt.name);
    setSearchQuery(null);
    setIsOpen(false);
    ignoreSyncRef.current = true;
    onChange(opt.id !== undefined ? opt.id : opt.name);
    focusNextElement();
  };

  const handleSelectCustom = (customName: string) => {
    setInputValue(customName);
    setSearchQuery(null);
    setIsOpen(false);
    ignoreSyncRef.current = true;
    onChange(customName);
    focusNextElement();
  };

  // When options update while typing (e.g. from async onSearch), update ghost suggestion
  useEffect(() => {
    if (
      !isOpen ||
      !searchQuery ||
      !searchQuery.trim() ||
      isDeletingRef.current
    )
      return;
    const rawVal = searchQuery;
    const match =
      options.find((opt) =>
        opt.name.toLowerCase().startsWith(rawVal.toLowerCase()),
      ) ||
      options.find(
        (opt) =>
          (opt.code &&
            opt.code.toLowerCase().startsWith(rawVal.toLowerCase())) ||
          (opt.id !== undefined &&
            String(opt.id).toLowerCase().startsWith(rawVal.toLowerCase())),
      );

    if (match) {
      const matchName = match.name;
      let completedText = matchName;
      let typedLen = rawVal.length;

      if (matchName.toLowerCase().startsWith(rawVal.toLowerCase())) {
        completedText = rawVal + matchName.slice(rawVal.length);
        typedLen = rawVal.length;
      } else {
        completedText = matchName;
        typedLen = 0;
      }

      setInputValue(completedText);
      const matchIndex = filteredOptions.findIndex(
        (opt) => opt.name.toLowerCase() === match.name.toLowerCase(),
      );
      setHighlightedIndex(matchIndex >= 0 ? matchIndex : 0);

      setTimeout(() => {
        if (
          internalInputRef.current &&
          document.activeElement === internalInputRef.current
        ) {
          internalInputRef.current.setSelectionRange(
            typedLen,
            completedText.length,
          );
        }
      }, 10);
    }
  }, [options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const isDeleting = isDeletingRef.current;
    isDeletingRef.current = false;
    setSearchQuery(rawVal);

    if (onSearch) {
      onSearch(rawVal);
    }

    if (!isOpen) {
      setIsOpen(true);
    }

    // If user is deleting or cleared input, do not auto-suggest completion
    if (isDeleting || !rawVal.trim()) {
      setInputValue(rawVal);
      setHighlightedIndex(-1);
      return;
    }

    // Find best match starting with what user typed
    const match =
      options.find((opt) =>
        opt.name.toLowerCase().startsWith(rawVal.toLowerCase()),
      ) ||
      options.find(
        (opt) =>
          (opt.code &&
            opt.code.toLowerCase().startsWith(rawVal.toLowerCase())) ||
          (opt.id !== undefined &&
            String(opt.id).toLowerCase().startsWith(rawVal.toLowerCase())),
      );

    if (match) {
      const matchName = match.name;
      let completedText = matchName;
      let typedLen = rawVal.length;

      if (matchName.toLowerCase().startsWith(rawVal.toLowerCase())) {
        completedText = rawVal + matchName.slice(rawVal.length);
        typedLen = rawVal.length;
      } else {
        completedText = matchName;
        typedLen = 0;
      }

      setInputValue(completedText);

      const matchIndex = filteredOptions.findIndex(
        (opt) => opt.name.toLowerCase() === match.name.toLowerCase(),
      );
      setHighlightedIndex(matchIndex >= 0 ? matchIndex : 0);

      const fullLen = completedText.length;
      setTimeout(() => {
        if (internalInputRef.current) {
          internalInputRef.current.setSelectionRange(typedLen, fullLen);
        }
      }, 0);
    } else {
      setInputValue(rawVal);
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Global Ctrl+S passes through
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      return;
    }

    if (e.key === "Backspace") {
      const input = internalInputRef.current;
      const curVal = input ? input.value : inputValue;
      if (!curVal || curVal.trim() === "") {
        e.preventDefault();
        setIsOpen(false);
        if (onPrev) {
          onPrev();
        } else {
          focusPrevElement();
        }
        return;
      }

      if (input) {
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        // If there's an inline suggested selection at the end of the text:
        if (start < end && end === input.value.length) {
          e.preventDefault();
          isDeletingRef.current = true;
          // Delete the selection AND the character immediately before it
          const newText = input.value.slice(0, Math.max(0, start - 1));
          setInputValue(newText);
          setSearchQuery(newText);
          setHighlightedIndex(-1);
          setTimeout(() => {
            if (internalInputRef.current) {
              internalInputRef.current.setSelectionRange(
                newText.length,
                newText.length,
              );
            }
          }, 0);
          return;
        }
      }
      isDeletingRef.current = true;
      return;
    }

    if (e.key === "Delete") {
      isDeletingRef.current = true;
      return;
    }

    isDeletingRef.current = false;

    // --- DOWN ARROW: Navigate down into dropdown list ---
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();

      if (!isOpen) {
        setIsOpen(true);
      }

      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => {
          const next = prev + 1 >= filteredOptions.length ? 0 : prev + 1;
          const targetOpt = filteredOptions[next];
          // If something was typed, allow cycling suggestion text; but if nothing is inputted, do NOT directly select - allow scrolling through the menu list!
          if (inputValue.trim() && targetOpt) {
            setInputValue(targetOpt.name);
            setTimeout(() => {
              if (internalInputRef.current) {
                internalInputRef.current.setSelectionRange(
                  targetOpt.name.length,
                  targetOpt.name.length,
                );
              }
            }, 0);
          }
          return next;
        });
      }
      return;
    }

    // --- UP ARROW: Navigate up in dropdown list ---
    if (e.key === "ArrowUp") {
      if (!isOpen && onPrev) {
        e.preventDefault();
        onPrev();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (!isOpen) {
        setIsOpen(true);
      }

      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => {
          const next = prev <= 0 ? filteredOptions.length - 1 : prev - 1;
          const targetOpt = filteredOptions[next];
          // If something was typed, allow cycling suggestion text; but if nothing is inputted, do NOT directly select - allow scrolling through the menu list!
          if (inputValue.trim() && targetOpt) {
            setInputValue(targetOpt.name);
            setTimeout(() => {
              if (internalInputRef.current) {
                internalInputRef.current.setSelectionRange(
                  targetOpt.name.length,
                  targetOpt.name.length,
                );
              }
            }, 0);
          }
          return next;
        });
      }
      return;
    }

    // --- RIGHT ARROW: Accept inline suggestion and move cursor to end ---
    if (e.key === "ArrowRight") {
      const input = internalInputRef.current;
      if (input && (input.selectionStart ?? 0) < (input.selectionEnd ?? 0)) {
        e.preventDefault();
        input.setSelectionRange(input.value.length, input.value.length);
      }
      return;
    }

    // --- SHIFT + ENTER: Move backward to previous field ---
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      if (onPrev) {
        onPrev();
      } else {
        focusPrevElement();
      }
      return;
    }

    // --- ENTER: Commit current suggestion/item and move to next field ---
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else {
        commitValue(inputValue);
        setIsOpen(false);
        focusNextElement();
      }
      return;
    }

    // --- TAB: Commit current suggestion/item and move to next field ---
    if (e.key === "Tab") {
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else {
        commitValue(inputValue);
        setIsOpen(false);
        if (onNext) {
          e.preventDefault();
          onNext();
        }
      }
      return;
    }

    // --- ESCAPE: Close dropdown ---
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchQuery(null);
      return;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    setSearchQuery(null);
    // When focused, if input has content, find if it matches an option
    if (inputValue.trim()) {
      const idx = options.findIndex(
        (opt) =>
          opt.name.toLowerCase() === inputValue.trim().toLowerCase() ||
          (opt.code &&
            opt.code.toLowerCase() === inputValue.trim().toLowerCase()) ||
          (opt.id !== undefined &&
            String(opt.id).toLowerCase() === inputValue.trim().toLowerCase()),
      );
      setHighlightedIndex(idx >= 0 ? idx : -1);
    } else {
      setHighlightedIndex(-1);
    }
  };

  const handleClickAway = () => {
    if (isOpen) {
      setIsOpen(false);
      setSearchQuery(null);
      commitValue(inputValue);
    }
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={containerRef} sx={{ position: "relative", width: "100%" }}>
        <TextField
          id={id}
          label={label}
          fullWidth
          size="small"
          variant={variant}
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          inputRef={setCombinedRef}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          autoComplete="off"
          sx={sx}
          error={error}
          helperText={helperText}
          InputProps={InputProps}
        />

        <Popper
          open={
            isOpen &&
            !disabled &&
            (filteredOptions.length > 0 ||
              (allowCreate && !!inputValue.trim() && !exactMatch) ||
              (!allowCreate && filteredOptions.length === 0))
          }
          anchorEl={containerRef.current}
          placement="bottom-start"
          style={{
            minWidth: Math.max(containerRef.current?.clientWidth || 0, 260),
            width: containerRef.current?.clientWidth || "auto",
            zIndex: 1400,
          }}
        >
          <Paper
            elevation={4}
            sx={{
              maxHeight: 240,
              overflowY: "auto",
              mt: 0.5,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <MenuList dense sx={{ py: 0.5 }}>
              {(() => {
                let currentGroup: string | null = null;
                return filteredOptions.map((opt, index) => {
                  const isSelected = index === highlightedIndex;
                  const showGroupHeader = Boolean(
                    opt.group && opt.group !== currentGroup,
                  );
                  if (opt.group) {
                    currentGroup = opt.group;
                  }

                  return (
                    <React.Fragment key={opt.id ?? opt.name}>
                      {showGroupHeader && (
                        <ListSubheader
                          sx={{
                            lineHeight: "28px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "text.secondary",
                            bgcolor: "background.paper",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {opt.group}
                        </ListSubheader>
                      )}
                      <MenuItem
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectOption(opt);
                        }}
                        sx={{
                          fontSize: "0.875rem",
                          py: 0.75,
                          px: 1.5,
                          pl: opt.group ? 2.5 : 1.5,
                          fontWeight: isSelected ? 600 : 400,
                          "&.Mui-selected": {
                            bgcolor: "action.selected",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            overflow: "hidden",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "inherit" }}
                            noWrap
                          >
                            {opt.name}
                          </Typography>
                          {opt.code && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontFamily: "monospace",
                                fontSize: "0.725rem",
                              }}
                              noWrap
                            >
                              {opt.code}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    </React.Fragment>
                  );
                });
              })()}

              {/* If user typed a custom option that isn't in the list and allowCreate is true */}
              {allowCreate && inputValue.trim() && !exactMatch && (
                <MenuItem
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectCustom(inputValue.trim());
                  }}
                  sx={{
                    fontSize: "0.875rem",
                    py: 0.75,
                    px: 1.5,
                    color: "primary.main",
                    fontStyle: "italic",
                    borderTop:
                      filteredOptions.length > 0 ? "1px dashed" : "none",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="primary.main"
                    fontWeight={600}
                  >
                    + Add &quot;{inputValue.trim()}&quot;
                  </Typography>
                </MenuItem>
              )}

              {/* If allowCreate is false and no matching options found */}
              {!allowCreate && filteredOptions.length === 0 && (
                <MenuItem
                  disabled
                  sx={{ fontStyle: "italic", fontSize: "0.8rem" }}
                >
                  No matching options
                </MenuItem>
              )}
            </MenuList>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
