import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

let mainModule: any;

beforeAll(() => {
  // Mock electron-store so it does not call app.getPath
  jest.mock('electron-store', () => {
    return jest.fn().mockImplementation(() => {
      return {
        set: jest.fn(),
        get: jest.fn(),
      };
    });
  });

  jest.mock('electron-updater', () => ({
    autoUpdater: {
      checkForUpdatesAndNotify: jest.fn(),
      on: jest.fn(),
    },
  }));

  // Mock electron
  jest.mock('electron', () => ({
    app: {
      whenReady: jest.fn().mockResolvedValue(true),
      on: jest.fn(),
      // Provide a mock getPath so electron-store won't crash:
      getPath: jest.fn().mockReturnValue('/fakeUserDataPath'),
      getVersion: jest.fn().mockReturnValue('1.0.0'),
    },
    BrowserWindow: jest.fn().mockImplementation(() => ({
      loadURL: jest.fn(),
      loadFile: jest.fn(),
      webContents: {
        openDevTools: jest.fn(),
      },
    })),
    ipcMain: {
      handle: jest.fn(),
    },
    dialog: {
      showOpenDialog: jest.fn(),
      showSaveDialog: jest.fn(),
      showMessageBox: jest.fn(),
    },
  }));

  // Mock fs-extra
  jest.mock('fs-extra', () => ({
    readFile: jest.fn(),
    writeFile: jest.fn(),
  }));

  // Now require the main module AFTER the mocks
  mainModule = require('../electron-main');
});

afterAll(() => {
  jest.resetModules();
});

describe('electron-main.ts', () => {
  it('should load the main module without crashing', () => {
    expect(mainModule).toBeTruthy();
  });
});
