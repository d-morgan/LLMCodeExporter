import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileScannerConfig } from '../src/hooks/useFileScannerConfig';

describe('useFileScannerConfig', () => {
  beforeAll(() => {
    (window as any).electron = {
      ipcRenderer: {
        invoke: jest.fn(async (channel: string, data?: any) => {
          // Mock load-config and save-config behaviour
          if (channel === 'load-config') {
            return {}; // Return no config => defaults used
          }
          if (channel === 'save-config') {
            return data;
          }
        }),
      },
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns defaults and merges them', async () => {
    const { result } = renderHook(() => useFileScannerConfig());

    await waitFor(() => {
      // Once defaults are loaded, we expect some file types
      expect(result.current.allowedTypes.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setAllowedTypes((prev) => [...prev, '.rs']);
    });

    await waitFor(() => {
      expect(window.electron.ipcRenderer.invoke).toHaveBeenCalledWith(
        'save-config',
        expect.objectContaining({
          allowedTypes: expect.arrayContaining(['.rs']),
        })
      );
    });
  });
});
