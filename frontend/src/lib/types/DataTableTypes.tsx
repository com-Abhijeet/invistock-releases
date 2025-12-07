import type { ReactNode } from "react";

export interface Column {
  key: string;
  label: string;
  align?: "right" | "left" | "center";
  format?: (value: any, row: any) => ReactNode;
}

export interface Action {
  icon: ReactNode;
  onClick: (row: any) => void;
  label: string;
}

export interface DataTableProps {
  rows: any[];
  columns: Column[];
  actions?: Action[];
  loading: boolean;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newLimit: number) => void;
  hidePagination?: Boolean;
  rowsPerPageOptions?: number[];
}
