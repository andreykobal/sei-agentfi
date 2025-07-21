"use client";

import { usePathname } from "next/navigation";
import { FloatingChat } from "./floating-chat";

export function ConditionalFloatingChat() {
  const pathname = usePathname();

  // Hide floating chat on the dedicated chat page
  if (pathname === "/chat") {
    return null;
  }

  return <FloatingChat />;
}
