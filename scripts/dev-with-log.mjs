import { spawn } from 'node:child_process';
import fs from 'node:fs';

const logPath = process.env.PARES_DEV_LOG_PATH || '/tmp/pares-dev.log';

const out = fs.createWriteStream(logPath, { flags: 'w' });

function tee(stream, prefix = '') {
  stream.on('data', (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    process.stdout.write(buf);
    out.write(buf);
  });
}

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['next', 'dev'],
  {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  }
);

tee(child.stdout);
tee(child.stderr);

const shutdown = (signal) => {
  try {
    child.kill(signal);
  } catch {
    // ignore
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

child.on('exit', (code, signal) => {
  out.end();
  if (signal) process.exit(0);
  process.exit(code ?? 0);
});
