import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import MetaMaskApp from "./components/MetaMaskApp";
import { LanguageProvider } from "./contexts/LanguageContext";

// Farcaster MiniApp SDK
import { MiniAppSDK } from "@farcaster/miniapp-sdk";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false },
  },
});

function App() {
  useEffect(() => {
    // Sadece Warpcast içindeyken çalışır
    const isWarpcast = /Warpcast/i.test(navigator.userAgent);
    if (!isWarpcast) return;

    const sdk = new MiniAppSDK();
    sdk.actions
      .ready()
      .then(() => console.log("Miniapp ready called"))
      .catch((err) => console.error("Miniapp ready error:", err));
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
