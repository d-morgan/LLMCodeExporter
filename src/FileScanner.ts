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

  console.log('>>> FileScanner.gatherFiles called with:', {
    rootDir,
    allowedFileTypes,
    ignoreDirs,
    ignoreFiles,
    maxFileSizeBytes,
  });

  const results: string[] = [];
  const visitedPaths = new Set<string>();

  async function recurse(currentPath: string) {
    if (visitedPaths.has(currentPath)) return;
    visitedPaths.add(currentPath);

    try {
      const stat = await fsExtra.lstat(currentPath);
      if (stat.isSymbolicLink()) {
        console.log(`>>> Skipping symlink: ${currentPath}`);
        return;
      }

      if (stat.isDirectory()) {
        const dirName = path.basename(currentPath);
        if (ignoreDirs.includes(dirName)) {
          console.log(`>>> Skipping ignored directory: ${currentPath}`);
          return;
        }

        console.log(`>>> Scanning directory: ${currentPath}`);
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
          console.log(`>>> Skipping ignored file: ${currentPath}`);
          return;
        }

        // If allowedFileTypes is empty, include all files
        // Otherwise, only include files with the specified extensions
        const isAllowed =
          allowedFileTypes.length === 0 || allowedFileTypes.includes(ext);

        if (isAllowed) {
          // Check file size
          if (stat.size > maxFileSizeBytes) {
            console.log(
              `>>> Skipping large file: ${currentPath}, size=${stat.size} bytes`
            );
            return;
          }
          console.log(`>>> Adding file to results: ${currentPath} (${ext})`);
          results.push(currentPath);
        } else {
          console.log(
            `>>> Skipping file with non-allowed extension: ${currentPath} (${ext})`
          );
        }
      }
    } catch (error) {
      console.error(`>>> Error processing path ${currentPath}:`, error);
    }
  }

  await recurse(rootDir);
  console.log(`>>> FileScanner.gatherFiles returning ${results.length} files`);
  return results;
}
