#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { spawnSync } from 'node:child_process';

const TARGET_ASPECT = 16 / 9;
const ASPECT_TOLERANCE = 0.01;

function usage() {
  console.error('Usage: node tools/video/recxr/validate-packed-video.mjs path/to/export.mp4');
}

function runFfprobe(filePath) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-count_frames',
      '-show_entries',
      'stream=width,height,nb_frames,nb_read_frames,avg_frame_rate,duration:format=duration',
      '-of',
      'json',
      filePath,
    ],
    { encoding: 'utf8' }
  );

  if (result.error?.code === 'ENOENT') {
    throw new Error('ffprobe was not found. Install FFmpeg and make sure ffprobe is on your PATH.');
  }

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'ffprobe failed.');
  }

  return JSON.parse(result.stdout);
}

function parseNumber(value) {
  if (value == null || value === 'N/A') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseFrameRate(value) {
  if (!value || value === '0/0') return null;
  const [numerator, denominator] = value.split('/').map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

function formatSeconds(value) {
  if (value == null) return 'unavailable';
  return `${value.toFixed(3)}s`;
}

function formatAspect(value) {
  if (value == null) return 'unavailable';
  return `${value.toFixed(4)}:1`;
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

const filePath = process.argv[2];

if (!filePath) {
  usage();
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

try {
  const probe = runFfprobe(filePath);
  const stream = probe.streams?.[0];

  if (!stream) {
    throw new Error('No video stream found.');
  }

  const width = parseNumber(stream.width);
  const height = parseNumber(stream.height);
  const heightIsEven = height != null && height % 2 === 0;
  const visibleHeight = heightIsEven ? height / 2 : null;
  const visibleAspect = width != null && visibleHeight ? width / visibleHeight : null;
  const visibleIs16x9 = visibleAspect != null && Math.abs(visibleAspect - TARGET_ASPECT) <= ASPECT_TOLERANCE;
  const frameRate = parseFrameRate(stream.avg_frame_rate);
  const frameCount = parseNumber(stream.nb_read_frames) ?? parseNumber(stream.nb_frames);
  const duration = parseNumber(stream.duration) ?? parseNumber(probe.format?.duration);

  console.log(`RecXR packed presenter validation: ${basename(filePath)}`);
  console.log('');
  console.log(`width: ${width ?? 'unavailable'}`);
  console.log(`height: ${height ?? 'unavailable'}`);
  console.log(`height is even: ${yesNo(heightIsEven)}`);
  console.log(`inferred visible height: ${visibleHeight ?? 'unavailable'}`);
  console.log(`visible-half aspect ratio: ${formatAspect(visibleAspect)}`);
  console.log(`visible half is 16:9: ${yesNo(visibleIs16x9)}`);
  console.log(`frame count: ${frameCount ?? 'unavailable'}`);
  console.log(`duration: ${formatSeconds(duration)}`);
  console.log(`average frame rate: ${frameRate == null ? 'unavailable' : `${frameRate.toFixed(3)} fps`}`);

  if (!heightIsEven || !visibleIs16x9) {
    console.log('');
    console.log('Notes:');
    if (!heightIsEven) {
      console.log('- Packed height should be even so the visible RGB half and matte half split cleanly.');
    }
    if (!visibleIs16x9) {
      console.log('- Visible half is not 16:9. This may be intentional for portrait-packed exports like 1080x1920, but it will stretch on the current WebXR plane unless the plane geometry is changed.');
    }
  }
} catch (error) {
  console.error(`Validation failed: ${error.message}`);
  process.exit(1);
}
