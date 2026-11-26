import { randomBytes, scryptSync } from 'node:crypto';
console.log('Enter administrator password (hidden), then press Enter:');
process.stdin.setRawMode?.(true); process.stdin.resume();
let password = '';
process.stdin.on('data', chunk => {
  const text = chunk.toString(); if (text.includes('\u0003')) process.exit(1);
  if (text.includes('\r') || text.includes('\n')) {
    if (password.length < 8) { console.error('Use at least 8 characters.'); process.exit(1); }
    const salt = randomBytes(16).toString('hex'); console.log('\nADMIN_PASSWORD_HASH=' + salt + ':' + scryptSync(password, salt, 64).toString('hex'));
    console.log('CONFIG_ENCRYPTION_KEY=' + randomBytes(32).toString('hex')); process.exit(0);
  }
  if (text === '\u007f' || text === '\b') password = password.slice(0, -1); else password += text;
});
