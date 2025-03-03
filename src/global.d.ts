export {};

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        invoke: (channel: string, args?: any) => Promise<any>;
        on: (channel: string, listener: (...args: any[]) => void) => void;
        once: (channel: string, listener: (...args: any[]) => void) => void;
        removeListener: (
          channel: string,
          listener: (...args: any[]) => void
        ) => void;
      };
    };
  }
}
