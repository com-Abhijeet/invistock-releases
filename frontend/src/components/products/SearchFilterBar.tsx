"use client";

import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Search, RefreshCcw } from "lucide-react";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
};

export default function SearchFilterBar({
  search,
  onSearchChange,
  onRefresh,
}: Props) {
  return (
    <Box display="flex" alignItems="center" gap={2} mb={2}>
      <TextField
        size="small"
        placeholder="Search "
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 250 }}
      />
      <Tooltip title="Refresh Table">
        <IconButton onClick={onRefresh}>
          <RefreshCcw size={18} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
