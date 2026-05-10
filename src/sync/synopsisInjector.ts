/**
 * Insert `synopsis` as a new paragraph immediately after frontmatter (if any),
 * separated by blank lines from surrounding content. Pure string transform.
 *
 * @param content full file content
 * @param synopsis text to insert (no trailing newline expected)
 * @param frontmatterEnd offset of the first byte after the closing `---\n`,
 *                       or null if the file has no frontmatter
 */
export function composeWithSynopsis(
  content: string,
  synopsis: string,
  frontmatterEnd: number | null,
): string {
  if (content === "") return synopsis + "\n";
  const insertAt = frontmatterEnd ?? 0;
  const before = content.slice(0, insertAt);
  const after = content.slice(insertAt);
  let lead: string;
  if (before === "") lead = "";
  else if (before.endsWith("\n")) lead = "\n";
  else lead = "\n\n";
  const trail = after.startsWith("\n") ? "\n" : "\n\n";
  return before + lead + synopsis + trail + after.replace(/^\n+/, "");
}
