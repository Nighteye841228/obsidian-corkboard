export function nextUntitled(existingFileNames: string[]): string {
  const taken = new Set<number>();
  for (const name of existingFileNames) {
    const m = name.match(/^Untitled-(\d+)\.md$/);
    if (m) taken.add(Number(m[1]));
  }
  let i = 1;
  while (taken.has(i)) i++;
  return `Untitled-${i}.md`;
}
