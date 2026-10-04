/** SHA-256 of a UTF-8 string, computed in the browser. Only this hash goes on-chain. */
export async function sha256(text: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

export const toHex = (bytes: ArrayLike<number>): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
