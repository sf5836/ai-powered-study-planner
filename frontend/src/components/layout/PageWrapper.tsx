import type { ReactNode } from "react";
import { useUserStore } from "../../stores/userStore";

type PageWrapperProps = {
  children: ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const sidebarCollapsed = useUserStore((state) => state.sidebarCollapsed);

  return (
    <main
      className={[
        "min-h-screen bg-lightBg pt-[56px] transition-[margin] duration-300 dark:bg-[#0D1B40]",
        sidebarCollapsed ? "lg:ml-[64px]" : "lg:ml-[220px]",
      ].join(" ")}
    >
      {children}
    </main>
  );
}
