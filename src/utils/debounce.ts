export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let t: number | null = null;
  return (...args: A) => {
    if (t !== null) window.clearTimeout(t);
    t = window.setTimeout(() => { t = null; fn(...args); }, ms);
  };
}
