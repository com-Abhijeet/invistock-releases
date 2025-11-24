"use client";

import { useEffect, useState } from "react";
import OnboardingScreen from "../components/setup/OnboardingScreen";
import { CircularProgress, Box } from "@mui/material";
import type { ShopSetupForm as Shop } from "../lib/types/shopTypes";
import { getShopData } from "../lib/api/shopService";

export default function ShopProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isShopReady, setIsShopReady] = useState<boolean | null>(null);

  useEffect(() => {
    const initShop = async () => {
      const shop = await getShopData();
      setIsShopReady(!!shop);
    };

    initShop();
  }, []);

  if (isShopReady === null) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isShopReady)
    return (
      <OnboardingScreen
        onSetupComplete={(shopData?: Shop) => {
          if (shopData) {
            localStorage.setItem("shop", JSON.stringify(shopData));
          }
          setIsShopReady(true);
        }}
      />
    );

  return <>{children}</>;
}
