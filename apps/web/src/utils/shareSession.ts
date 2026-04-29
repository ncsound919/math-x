// URL-based session sharing using pako compression + base64 encoding.
// The full session is encoded into the URL hash — zero server required.
import type { Session } from '../state/types';

// Compress + base64 encode using native CompressionStream (modern browsers)
async function compress(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return btoa(String.fromCharCode(...merged));
}

async function decompress(b64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

export async function encodeSessionToURL(session: Session): Promise<string> {
  const json = JSON.stringify(session);
  const encoded = await compress(json);
  const url = new URL(window.location.href);
  url.hash = `session=${encodeURIComponent(encoded)}`;
  return url.toString();
}

export async function decodeSessionFromURL(): Promise<Session | null> {
  const hash = window.location.hash;
  const match = hash.match(/session=([^&]+)/);
  if (!match) return null;
  try {
    const encoded = decodeURIComponent(match[1]);
    const json = await decompress(encoded);
    const session = JSON.parse(json) as Session;
    // Clear the hash after loading so the URL stays clean
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return session;
  } catch (e) {
    console.warn('Failed to decode session from URL:', e);
    return null;
  }
}

export async function copyShareLink(session: Session): Promise<void> {
  const url = await encodeSessionToURL(session);
  await navigator.clipboard.writeText(url);
}
