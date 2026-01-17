"use client";

import { SessionProvider } from "next-auth/react";
import { QueryProvider } from "./components/QueryProvider";
import { ConfigProvder } from "./components/ConfigProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ConfigProvder> {children}</ConfigProvder>
      </QueryProvider>
    </SessionProvider>
  );
}
