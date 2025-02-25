import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    once: (channel: string, listener: (...args: any[]) => void) => void;
    removeListener: (
      channel: string,
      listener: (...args: any[]) => void
    ) => void;
  };
}

const electronAPI: ElectronAPI = {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) =>
      ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    once: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.once(channel, (event, ...args) => listener(...args));
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, listener);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
