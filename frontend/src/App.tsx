import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import MetaMaskApp from "./components/MetaMaskApp";
import { LanguageProvider } from "./contexts/LanguageContext";

import { sdk } from "@farcaster/miniapp-sdk"; // ← doğru import

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } },
});

function App() {
  useEffect(() => {
    if (!sdk.isInMiniApp?.()) return; // Warpcast/Base içindeyse çalıştır
    sdk.actions.ready().catch((e) => console.error("miniapp ready error:", e));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LanguageProvider>
          <MetaMaskApp />
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
