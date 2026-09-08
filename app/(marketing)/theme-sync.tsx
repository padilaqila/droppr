"use client";

import { useEffect } from "react";

export function MarketingThemeSync() {
  useEffect(() => {
    if (document.documentElement.classList.contains("light")) {
      document.documentElement.classList.remove("light");
    }
  }, []);

  return null;
}
