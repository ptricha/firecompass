"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/** The guided tour: one stop per page, in a logical learning order. */
export const TOUR = ["/", "/learn", "/history", "/simulator", "/lab", "/explorer", "/dashboard", "/ask", "/references"] as const;

interface Ctx {
  on: boolean;
  setOn: (v: boolean) => void;
}
const GuideContext = createContext<Ctx>({ on: false, setOn: () => {} });

export function GuideProvider({ children }: { children: ReactNode }) {
  const [on, setOnState] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("japax-guide") === "1") setOnState(true);
    } catch {}
  }, []);
  const setOn = useCallback((v: boolean) => {
    setOnState(v);
    try {
      localStorage.setItem("japax-guide", v ? "1" : "0");
    } catch {}
  }, []);
  return <GuideContext.Provider value={{ on, setOn }}>{children}</GuideContext.Provider>;
}

export const useGuide = () => useContext(GuideContext);
