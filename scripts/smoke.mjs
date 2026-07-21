#!/usr/bin/env node
/**
 * روش — اختبار دخان: بيشغّل السيرفر، يفتح الصفحة بمتصفح حقيقي،
 * ويتأكد إنها اترندرت فعلًا ومفيش أخطاء كونسول ووصلت لـ Supabase.
 * الاستخدام:  node scripts/smoke.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123;
const URL_BASE = `http://localhost:${PORT}`;

/* ---------- شغّل المتصفح (playwright أو playwright-core بمتصفح النظام) ---------- */
async function launchBrowser() {
  try {
    const { chromium } = await import('playwright');
    return await chromium.launch({ headless: true });
  } catch {}
  const { chromium } = await import('playwright-core');
  for (const channel of ['chromium', 'msedge', 'chrome']) {
    try { return await chromium.launch({ channel, headless: true }); } catch {}
  }
  throw new Error('مفيش متصفح متاح — سطّب playwright أو Chrome/Edge');
}

/* ---------- استنى السيرفر يقوم ---------- */
async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL_BASE + '/', { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('السيرفر مقامش في الوقت المحدد');
}

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/dev-server.mjs')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
const shutdown = () => { try { server.kill(); } catch {} };
process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(130); });

let browser;
const failures = [];
try {
  await waitForServer();
  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message.slice(0, 200)));

  console.log('\n  \x1b[33m✦ اختبار دخان لروش\x1b[0m\n');

  await page.goto(URL_BASE + '/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(4000);

  const check = (label, ok, extra = '') => {
    console.log(`  ${label} … ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✕\x1b[0m'}${extra ? '  ' + extra : ''}`);
    if (!ok) failures.push(label);
  };

  // 1) شاشة الدخول اترندرت (مش عالقة على شاشة التحميل)
  check('شاشة الدخول اتبنت', (await page.locator('.auth-wrap').count()) > 0);
  check('مش عالق على شاشة التحميل', (await page.locator('.boot').count()) === 0);

  // 2) هوية المنصة ظاهرة
  const logo = (await page.locator('.auth-logo').textContent().catch(() => '')) || '';
  check('اللوجو ظاهر', logo.includes('روش'), `"${logo.trim()}"`);

  // 3) الاتصال بـ Supabase شغال (فحص اسم مستخدم = استعلام حقيقي)
  let hint = '';
  try {
    await page.click('button[data-t="signup"]');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="rawsh_hero"]', 'ci_smoke_' + Math.floor(Math.random() * 99999));
    await page.waitForTimeout(3000);
    hint = ((await page.locator('.field .hint').first().textContent()) || '').trim();
  } catch (e) { hint = 'خطأ: ' + e.message.slice(0, 80); }
  check('الاتصال بـ Supabase', hint.includes('متاح') || hint.includes('محجوز'), `"${hint}"`);

  // 4) مفيش أخطاء كونسول
  check('مفيش أخطاء كونسول', consoleErrors.length === 0, consoleErrors.length ? consoleErrors.join(' | ') : '');
} catch (err) {
  console.error('\n  \x1b[31m✕ الاختبار وقع:\x1b[0m ' + err.message);
  failures.push('تشغيل الاختبار');
} finally {
  await browser?.close().catch(() => {});
  shutdown();
}

if (failures.length) {
  console.log(`\n  \x1b[31m✕ فشل ${failures.length}: ${failures.join('، ')}\x1b[0m\n`);
  process.exit(1);
}
console.log('\n  \x1b[32m✓ كله شغال — روش تمام\x1b[0m\n');
process.exit(0);
