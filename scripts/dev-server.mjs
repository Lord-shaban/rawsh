#!/usr/bin/env node
/**
 * روش — سيرفر تطوير محلي بسيط (بدون تبعيات)
 * الاستخدام:  npm run dev   →   http://localhost:8080
 * تغيير البورت:  PORT=3000 npm run dev
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // امنع أي محاولة خروج بره فولدر المشروع
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    const stamp = new Date().toLocaleTimeString('en-GB');
    if (err) {
      console.log(`${stamp}  \x1b[31m404\x1b[0m  ${urlPath}`);
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1 style="font-family:system-ui">404 — الملف مش موجود</h1>');
      return;
    }
    console.log(`${stamp}  \x1b[32m200\x1b[0m  ${urlPath}`);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      // بدون كاش عشان أي تعديل يبان فورًا مع الـ refresh
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  \x1b[33m✦ روش\x1b[0m شغّال على  \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`  اضغط Ctrl+C للإيقاف\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✕ البورت ${PORT} مشغول. جرّب:  PORT=${PORT + 1} npm run dev\n`);
    process.exit(1);
  }
  throw err;
});
