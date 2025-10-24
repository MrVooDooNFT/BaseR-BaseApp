interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    isRabby?: boolean;
    isWalletConnect?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeAllListeners: (event: string) => void;
    send: (method: string, params?: any[]) => Promise<any>;
  };
}
