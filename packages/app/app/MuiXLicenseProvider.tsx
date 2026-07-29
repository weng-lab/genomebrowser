"use client";

import { LicenseInfo } from "@mui/x-license";
import type { ReactNode } from "react";

const muiXLicenseKey = process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY;

if (muiXLicenseKey) {
  LicenseInfo.setLicenseKey(muiXLicenseKey);
}

export function MuiXLicenseProvider({ children }: { children: ReactNode }) {
  return children;
}
