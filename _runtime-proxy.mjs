import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const listenPort = Number(process.env.RUNTIME_PROXY_PORT);
const targetPort = Number(process.env.RUNTIME_PROXY_TARGET_PORT);
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.join(projectDir, 'frontend', 'dist');
if (!Number.isInteger(listenPort) || !Number.isInteger(targetPort)) throw new Error('Runtime proxy ports are required');
if (!fs.existsSync(path.join(staticRoot, 'index.html'))) throw new Error('Frontend build is missing; run npm --prefix frontend run build');

const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

function proxy(request, response) {
  const upstream = http.request({
    hostname: '127.0.0.1', port: targetPort, path: request.url, method: request.method,
    headers: { ...request.headers, host: `127.0.0.1:${targetPort}` },
  }, incoming => {
    response.writeHead(incoming.statusCode || 502, incoming.headers);
    incoming.pipe(response);
  });
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Application listener is unavailable' }));
  });
  request.pipe(upstream);
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url || '/', `http://127.0.0.1:${listenPort}`).pathname;
  if (pathname.startsWith('/api/')) return proxy(request, response);
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const candidate = path.resolve(staticRoot, requested);
  const filePath = candidate.startsWith(`${staticRoot}${path.sep}`) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ? candidate : path.join(staticRoot, 'index.html');
  response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(listenPort, '127.0.0.1', () => console.log(`Catering UI listening on http://127.0.0.1:${listenPort}`));
