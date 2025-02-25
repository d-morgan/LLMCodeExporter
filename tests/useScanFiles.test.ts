import { renderHook, act, waitFor } from '@testing-library/react';
import { useScanFiles } from '../src/hooks/useScanFiles';

describe('useScanFiles', () => {
  const mockInvoke = jest.fn();
  const mockOn = jest.fn();
  const mockRemoveListener = jest.fn();

  beforeAll(() => {
    (window as any).electron = {
      ipcRenderer: {
        invoke: mockInvoke,
        on: mockOn,
        removeListener: mockRemoveListener,
      },
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the get-last-directory API call
    mockInvoke.mockImplementation(async (channel, ...args) => {
      if (channel === 'get-last-directory') {
        return '/test/dir';
      }
      if (channel === 'get-cached-files') {
        return [{ filePath: 'test.js', content: 'console.log("test");' }];
      }
      if (channel === 'toggle-file-watching') {
        return false; // Return false for isWatching state
      }
      return null;
    });
  });

  it('loads last directory on startup but does not set isWatching', async () => {
    const { result } = renderHook(() => useScanFiles());

    await waitFor(() => {
      expect(result.current.selectedDir).toBe('/test/dir');
      // Verify it loads the directory but doesn't set isWatching
      expect(result.current.isWatching).toBe(false);
    });
  });

  it('loads cached files from the server', async () => {
    const { result } = renderHook(() => useScanFiles());

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get-cached-files');
      expect(result.current.scannedFiles).toHaveLength(1);
      expect(result.current.scannedFiles[0].filePath).toBe('test.js');
    });
  });

  it('sets up a file update listener', async () => {
    renderHook(() => useScanFiles());

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith(
        'files-updated',
        expect.any(Function)
      );
    });
  });

  it('cleans up listener on unmount', async () => {
    const { unmount } = renderHook(() => useScanFiles());
    unmount();

    expect(mockRemoveListener).toHaveBeenCalledWith(
      'files-updated',
      expect.any(Function)
    );
  });

  it('correctly handles file selection', async () => {
    const { result } = renderHook(() => useScanFiles());

    // Wait for cached files to load and auto-select first file
    await waitFor(() => {
      expect(result.current.scannedFiles).toHaveLength(1);
      // First file is auto-selected, so selectedFile shouldn't be null
      expect(result.current.selectedFile).not.toBeNull();
    });

    // Clear selection first
    act(() => {
      result.current.setSelectedFile(null);
    });

    // Now selectedFile should be null
    expect(result.current.selectedFile).toBeNull();

    // Test the selectedFile setter
    const testFile = { filePath: 'test2.js', content: 'console.log("test2");' };
    act(() => {
      result.current.setSelectedFile(testFile);
    });

    // Now selectedFile should be set to our test file
    expect(result.current.selectedFile).toEqual(testFile);

    // Test clearing selection again
    act(() => {
      result.current.setSelectedFile(null);
    });

    expect(result.current.selectedFile).toBeNull();
  });
});
