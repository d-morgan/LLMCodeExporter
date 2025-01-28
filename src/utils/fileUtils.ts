export function getFileLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    rb: 'ruby',
    go: 'go',
    cs: 'csharp',
    cpp: 'cpp',
    html: 'html',
    css: 'css',
    swift: 'swift',
  };
  return map[ext] || 'text';
}
