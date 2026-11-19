// Solmara Bay — a tiny static server for local testing.
// Serves the game/ directory on port 8080 so the browser can load the
// module scripts and the vendored Three.js without a build step.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const PORT = Number(process.argv[2] || 8080);
const ROOT = process.cwd();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let file = url.pathname === '/' ? '/game/index.html' : url.pathname;
  if (file.endsWith('/')) file += 'index.html';
  if (file.startsWith('/game')) file = join(ROOT, file);
  else file = join(ROOT, 'game', file);
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, () => {
  console.log(`Solmara Bay at http://localhost:${PORT}/game/`);
});
