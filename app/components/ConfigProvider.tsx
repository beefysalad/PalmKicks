import { createContext, useContext } from "react";
import { useGetAllConfigs } from "@/lib/settings/hook";
import { Configurations } from "../generated/prisma/client";

const ConfigContext = createContext<Configurations[] | undefined>(undefined);

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return context;
}

interface ConfigProps {
  children: React.ReactNode;
}

export function ConfigProvder({ children }: ConfigProps) {
  const { data: configs } = useGetAllConfigs();

  return (
    <ConfigContext.Provider value={configs || []}>
      {children}
    </ConfigContext.Provider>
  );
}
