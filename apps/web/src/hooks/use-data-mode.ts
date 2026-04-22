"use client";

import { useEffect, useState } from "react";
import type { DataMode } from "@/lib/data/mode";
import { getDataMode, setDataMode } from "@/lib/data/mode";

export function useDataMode() {
  const [mode, setModeState] = useState<DataMode>("supabase");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(getDataMode());
  }, []);

  function setMode(mode: DataMode) {
    setDataMode(mode);
    setModeState(mode);
  }

  return { mode, setMode };
}

