"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "!bg-[#25262a] !border !border-cloud/10 !text-cloud !rounded-xl !font-sans",
            description: "!text-cloud/60",
            success: "[&_[data-icon]]:!text-sun",
            error: "[&_[data-icon]]:!text-red-400",
          },
        }}
      />
    </QueryClientProvider>
  );
}
