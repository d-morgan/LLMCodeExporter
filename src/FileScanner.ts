import * as path from 'path';
import * as fsExtra from 'fs-extra';

interface GatherConfig {
  allowedFileTypes?: string[];
  ignoreDirs?: string[];
  ignoreFiles?: string[];
  maxFileSizeBytes?: number;
}

/**
 * Recursively gather files from a root directory
 * that match the given allowed file types, ignoring
 * specified directories, skipping symlinks, and
 * optionally ignoring files above a certain size,
 * and ignoring specific file names.
 *
 * @param rootDir   - The path to the project root.
 * @param config    - Configuration object.
 */
export async function gatherFiles(
  rootDir: string,
  config: GatherConfig = {}
): Promise<string[]> {
  const {
    allowedFileTypes = [],
    ignoreDirs = [],
    ignoreFiles = [],
    maxFileSizeBytes = 5 * 1024 * 1024,
  } = config;

  const results: string[] = [];
  const visitedPaths = new Set<string>();

  async function recurse(currentPath: string) {
    if (visitedPaths.has(currentPath)) return;
    visitedPaths.add(currentPath);

    const stat = await fsExtra.lstat(currentPath);
    if (stat.isSymbolicLink()) return;

    if (stat.isDirectory()) {
      const dirName = path.basename(currentPath);
      if (ignoreDirs.includes(dirName)) return;

      const entries = await fsExtra.readdir(currentPath);
      for (const entry of entries) {
        await recurse(path.join(currentPath, entry));
      }
    } else {
      // Check file extension
      const ext = path.extname(currentPath).toLowerCase();
      const fileName = path.basename(currentPath);

      // If in ignoreFiles, skip
      if (ignoreFiles.includes(fileName)) {
        return;
      }

      // If extension is allowed
      if (allowedFileTypes.includes(ext)) {
        // Check file size
        if (stat.size > maxFileSizeBytes) {
          console.log(
            `Skipping large file: ${currentPath}, size=${stat.size} bytes`
          );
          return;
        }
        results.push(currentPath);
      }
    }
  }

  await recurse(rootDir);
  return results;
}
