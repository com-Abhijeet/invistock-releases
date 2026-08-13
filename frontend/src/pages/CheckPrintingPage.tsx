"use client";

import { useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import DashboardHeader from "../components/DashboardHeader";
import CheckPrintingContent from "../components/ui/CheckPrintingContent";

export default function CheckPrintingPage() {
  const location = useLocation();
  const initialData = location.state as
    | {
        payee?: string;
        amount?: number;
        date?: string;
      }
    | undefined;

  const [headerActions, setHeaderActions] = useState<ReactNode>(null);

  return (
    <Box sx={{ p: 3 }}>
      <DashboardHeader
        title="Cheque Printing & Bank Calibration Master"
        showDateFilters={false}
        actions={headerActions}
      />
      <CheckPrintingContent
        initialData={initialData}
        isModal={false}
        onHeaderActionsChange={setHeaderActions}
      />
    </Box>
  );
}

