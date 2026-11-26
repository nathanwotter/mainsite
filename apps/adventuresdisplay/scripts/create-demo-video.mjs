// Public sample photograph + generated quiet tone; no private album content.
import ffmpeg from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
await mkdir(new URL('../public/videos/', import.meta.url), { recursive: true });
await promisify(execFile)(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-loop', '1', '-i', fileURLToPath(new URL('../public/photos/coast.jpg', import.meta.url)), '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '6', '-vf', 'scale=1024:-2,zoompan=z=1+0.0005*on:x=iw/2-iw/zoom/2:y=ih/2-ih/zoom/2:d=1:s=640x480:fps=24', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-af', 'volume=0.03', '-movflags', '+faststart', '-threads', '1', '-shortest', '-y', fileURLToPath(new URL('../public/videos/coast-demo.mp4', import.meta.url))], { timeout: 30000, windowsHide: true });
console.log('Created six-second public sample clip with an optional quiet demonstration tone.');
