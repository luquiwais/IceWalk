"use client";

import { useEffect } from "react";

/**
 * The planner used to live at `/`. Links made before the landing page (`/?phase=eva&role=iv`, the
 * cuff sheet, notes in the docs) still open the planner, with the same phase and role.
 */
export function LegacyRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("phase") || params.has("role")) window.location.replace(`/app${window.location.search}`);
  }, []);
  return null;
}
