import { contextBridge, ipcRenderer } from 'electron';

interface ElectronAPI {
  ipcRenderer: {
    invoke: (channel: string, args?: any) => Promise<any>;
  };
}

const electronAPI: ElectronAPI = {
  ipcRenderer: {
    invoke: (channel: string, args?: any) => ipcRenderer.invoke(channel, args),
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
