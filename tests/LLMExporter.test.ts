import { formatForLLM } from '../src/LLMExporter';
import * as path from 'path';

describe('LLMExporter', () => {
  it('formats file content with a code fence', () => {
    const baseDir = '/path/to/project';
    const filePath = '/path/to/project/src/index.ts';
    const content = 'console.log("Hello, world");';

    const formatted = formatForLLM(filePath, content, baseDir);
    expect(formatted).toContain('```ts');
    expect(formatted).toContain('### File: `src/index.ts`');
    expect(formatted).toContain(content);
  });
});
