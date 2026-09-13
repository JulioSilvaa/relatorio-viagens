export function safeDispositionFilename(fileName: string, maxLength = 120): string {
  const clean: string[] = [];
  for (const char of fileName) {
    const code = char.codePointAt(0)!;
    if (code <= 0x1f || code === 0x7f || code === 0x22 || code === 0x0a || code === 0x0d) {
      continue;
    }
    clean.push(code >= 0x20 && code <= 0x7e ? char : '_');
  }
  const result = clean.join('').trim().slice(0, maxLength);
  return result || 'arquivo';
}
