import ffmpeg from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import '../public/core.js';
const run = promisify(execFile);
export const MAX_VIDEO_BYTES = 14_000_000;
export async function optimizeVideo(raw) {
  if (raw.length > 40_000_000) throw new Error('Video source too large');
  const dir = await mkdtemp(join(tmpdir(), 'adventuresdisplay-video-'));
  try {
    const input = join(dir, 'input'), output = join(dir, 'clip.mp4');
    await writeFile(input, raw);
    // Local downloaded input only: reject manifests that try to fetch other network resources.
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov', '-threads', '1', '-i', input, '-t', '90', '-map', '0:v:0', '-map', '0:a:0?', '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2', '-r', '24', '-c:v', 'libx264', '-profile:v', 'main', '-level', '3.1', '-preset', 'veryfast', '-crf', '26', '-maxrate', '1000k', '-bufsize', '2000k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100', '-map_metadata', '-1', '-movflags', '+faststart', '-threads', '1', '-y', output], { timeout: 45000, maxBuffer: 64000, windowsHide: true });
    const result = await readFile(output); if (result.length > MAX_VIDEO_BYTES) throw new Error('Video derivative too large'); return result;
  } catch { throw new Error('Video could not be optimized'); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
export function videoResponse(value, rangeHeader, cap = true) {
  const bytes = new Uint8Array(value), total = bytes.byteLength, range = globalThis.AdventuresDisplayCore.byteRange(rangeHeader, total);
  const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store' };
  if (range === false) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': 'bytes */' + total } });
  let body = bytes, status = 200;
  if (range) { const end = cap ? Math.min(range.end, range.start + 2_000_000 - 1) : range.end; body = bytes.slice(range.start, end + 1); status = 206; headers['Content-Range'] = `bytes ${range.start}-${end}/${total}`; }
  headers['Content-Length'] = String(body.length);
  // Streaming supports full non-range video requests; Safari normally uses bounded byte ranges.
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < body.length; i += 65536) controller.enqueue(body.slice(i, i + 65536)); controller.close(); } });
  return new Response(stream, { status, headers });
}
