"use client";

import AskChat from "@/components/AskChat";

/** Direct-link fallback. Inside the app, every link to /ask opens Pax's large Ask window instead (components/AskWindow.tsx). */
export default function Ask() {
  return <AskChat />;
}
