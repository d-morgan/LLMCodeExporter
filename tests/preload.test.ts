jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

describe('preload.ts', () => {
  it('should load without error', async () => {
    const mod = await import('../preload');
    expect(mod).toBeTruthy();
  });
});
