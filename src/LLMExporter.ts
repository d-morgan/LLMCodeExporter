import * as path from 'path';

/**
 * Format file content in a markdown code block
 * for best readability in LLM prompts.
 */
export function formatForLLM(
  filePath: string,
  content: string,
  baseDir: string
): string {
  // Shorten the filePath to be relative
  const relativePath = path.relative(baseDir, filePath);
  const extension = path.extname(filePath).slice(1); // e.g. "js", "py"

  return `### File: \`${relativePath}\`
\`\`\`${extension}
${content}
\`\`\``;
}
