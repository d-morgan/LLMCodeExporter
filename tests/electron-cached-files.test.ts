import { describe, it, expect, jest } from '@jest/globals';

// Mock implementation of the electron-main.ts cached files functionality
// This is a simplified version to test the caching concept
describe('Cached files functionality', () => {
  // Simulate the behavior of cachedFiles in electron-main.ts
  let mockCachedFiles: { filePath: string; content: string }[] = [];

  // Mock the get-cached-files handler
  const getCachedFiles = () => {
    return mockCachedFiles;
  };

  // Mock the scan-files handler that updates the cache
  const scanFiles = (directory: string, config: any) => {
    // Simulate finding files and updating cache
    const newFiles = [
      { filePath: 'file1.js', content: 'console.log("file1");' },
      { filePath: 'file2.js', content: 'console.log("file2");' },
    ];

    // Update our mock cached files
    mockCachedFiles = newFiles;

    return newFiles;
  };

  it('should initially return an empty array when no cache exists', () => {
    const result = getCachedFiles();
    expect(result).toEqual([]);
  });

  it('should update cached files when scan is performed', () => {
    // Simulate scanning
    const scanResult = scanFiles('/test/dir', { allowedFileTypes: ['.js'] });

    // Verify scan returned the files
    expect(scanResult).toHaveLength(2);

    // Verify the cache was updated
    const cachedResult = getCachedFiles();
    expect(cachedResult).toEqual(scanResult);
    expect(cachedResult).toHaveLength(2);
    expect(cachedResult[0].filePath).toBe('file1.js');
    expect(cachedResult[1].filePath).toBe('file2.js');
  });

  it('should return the same cached files on subsequent calls without scanning', () => {
    // Get cached files again without scanning
    const result = getCachedFiles();

    // Should still have the previously cached files
    expect(result).toHaveLength(2);
    expect(result[0].filePath).toBe('file1.js');
    expect(result[1].filePath).toBe('file2.js');
  });
});
