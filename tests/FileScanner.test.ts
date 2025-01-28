import { gatherFiles } from '../src/FileScanner';
import * as fsExtra from 'fs-extra';
import * as path from 'path';

jest.mock('fs-extra');

describe('FileScanner', () => {
  const mockFs = fsExtra as jest.Mocked<typeof fsExtra>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should gather allowed files and ignore others', async () => {
    // Setup a mock file structure
    mockFs.lstat.mockImplementation(async (filePath: unknown) => {
      if (typeof filePath !== 'string') {
        throw new Error(`filePath is not a string: ${String(filePath)}`);
      }

      // Mark the root directory itself as a directory:
      if (filePath === '/some/fake/dir') {
        return { isDirectory: () => true, isSymbolicLink: () => false } as any;
      }

      // Just pretend everything is a file, except for "node_modules"
      if (filePath.includes('node_modules') || filePath.includes('.git')) {
        return { isDirectory: () => true, isSymbolicLink: () => false } as any;
      }
      return {
        isDirectory: () => false,
        isSymbolicLink: () => false,
        size: 1000,
      } as any;
    });

    mockFs.readdir.mockImplementation(async (dirPath: unknown) => {
      if (typeof dirPath !== 'string') {
        throw new Error(`dirPath is not a string: ${String(dirPath)}`);
      }

      if (dirPath.includes('node_modules') || dirPath.includes('.git')) {
        return ['random.js'];
      }
      // pretend we have a variety of files
      return ['index.ts', 'index.css', 'node_modules', '.git', 'secret.txt'];
    });

    // We check a top-level directory
    const rootDir = '/some/fake/dir';

    const results = await gatherFiles(rootDir, {
      allowedFileTypes: ['.ts', '.tsx'],
      ignoreDirs: ['node_modules', '.git'],
      ignoreFiles: ['secret.txt'],
      maxFileSizeBytes: 5_000_000,
    });

    // We expect to get only .ts or .tsx files, ignoring the others
    expect(results).toEqual([path.join(rootDir, 'index.ts')]);
  });
});
