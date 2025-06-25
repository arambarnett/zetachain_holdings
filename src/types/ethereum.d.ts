interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (eventName: string, handler: (arg: unknown) => void) => void;
    removeListener: (eventName: string, handler: (arg: unknown) => void) => void;
  };
}