#!/usr/bin/env node
/**
 * روش — فحص سلامة الكود (بدون build)
 * بيتأكد إن كل الـ imports بتتحل صح وإن الـ JS/CSS مفيهاش أخطاء صياغة.
 * الاستخدام:  npm run check
 */
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

async function step(label, fn) {
  process.stdout.write(`  ${label} … `);
  try {
    await fn();
    console.log('\x1b[32m✓\x1b[0m');
  } catch (err) {
    console.log('\x1b[31m✕\x1b[0m');
    problems.push(`${label}\n${err.message}`);
  }
}

console.log('\n  \x1b[33m✦ فحص روش\x1b[0m\n');

// 1) الـ JS: bundle كامل عشان يتأكد إن كل import موجود ومفيش syntax errors
await step('جافاسكريبت (كل الموديولز)', () =>
  build({
    entryPoints: [path.join(ROOT, 'js/app.js')],
    bundle: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
    external: ['https://*'],
  })
);

// 2) الـ CSS — كل ملف لوحده (esbuild بيطلب outdir لو الملفات أكتر من واحد)
for (const file of ['css/design.css', 'css/layout.css', 'css/components.css']) {
  await step(file, () =>
    build({ entryPoints: [path.join(ROOT, file)], write: false, logLevel: 'silent' })
  );
}

// 3) الملفات اللي لازم تكون موجودة
await step('الملفات الأساسية', async () => {
  const required = [
    'index.html', 'manifest.webmanifest', 'sw.js', '_headers', '_redirects',
    'js/config.js', 'css/design.css', 'supabase/schema.sql', 'README.md', 'LICENSE',
  ];
  const missing = [];
  for (const f of required) {
    try { await fs.access(path.join(ROOT, f)); } catch { missing.push(f); }
  }
  if (missing.length) throw new Error('ملفات ناقصة: ' + missing.join(', '));
});

// 4) إعدادات Supabase موجودة ومش فاضية
await step('إعدادات Supabase', async () => {
  const src = await fs.readFile(path.join(ROOT, 'js/config.js'), 'utf8');
  if (!/url:\s*'https:\/\/[a-z0-9]+\.supabase\.co'/.test(src)) throw new Error('CONFIG.url مش مظبوط في js/config.js');
  if (!/anonKey:\s*'[\w.-]{40,}'/.test(src)) throw new Error('CONFIG.anonKey مش مظبوط في js/config.js');
});

// 5) كل ملفات الـ JS اللي في js/ متربوطة فعلًا (مفيش ملف يتيم)
await step('مفيش ملفات يتيمة', async () => {
  const files = (await fs.readdir(path.join(ROOT, 'js'))).filter((f) => f.endsWith('.js'));
  const sources = await Promise.all(
    files.map(async (f) => await fs.readFile(path.join(ROOT, 'js', f), 'utf8'))
  );
  const all = sources.join('\n');
  const orphans = files.filter((f) => f !== 'app.js' && !all.includes(`./${f}`));
  if (orphans.length) throw new Error('ملفات مش مستوردة من أي حتة: ' + orphans.join(', '));
});

if (problems.length) {
  console.log('\n\x1b[31m  ✕ فيه ' + problems.length + ' مشكلة:\x1b[0m\n');
  problems.forEach((p) => console.log('  ' + p.replace(/\n/g, '\n    ') + '\n'));
  process.exit(1);
}

console.log('\n  \x1b[32m✓ كله تمام — روش جاهز\x1b[0m\n');
