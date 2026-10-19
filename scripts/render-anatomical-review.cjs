// Optional local review screenshots. Requires Playwright and a Chromium installation.
// Set GRIT_PLAYWRIGHT_PACKAGE / GRIT_CHROMIUM_PATH when using an external installation.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.GRIT_PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const output = path.resolve(process.argv[2] || '/tmp/grit-anatomy-review');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.GRIT_CHROMIUM_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 1320, height: 950 } });
    await page.goto(pathToFileURL(path.join(output, 'index.html')).href);
    await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
    let entries = await page.locator('section[data-status="generated"]').evaluateAll(elements => elements.map(element => ({
      id: element.dataset.id, name: element.querySelector('h2').textContent,
    })));
    if (process.argv[3]) {
      const selected = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).map(entry => typeof entry === 'string' ? entry : entry.id);
      entries = entries.filter(entry => selected.includes(entry.id));
    }
    fs.writeFileSync(path.join(output, 'pages.json'), JSON.stringify(entries, null, 2));
    for (let start = 0; start < entries.length; start += 4) {
      const ids = entries.slice(start, start + 4).map(entry => entry.id);
      await page.locator('section').evaluateAll((elements, ids) => elements.forEach(element => {
        element.style.display = ids.includes(element.dataset.id) ? 'inline-block' : 'none';
      }), ids);
      await page.screenshot({ path: path.join(output, `page-${String(start / 4).padStart(2, '0')}.png`), fullPage: true });
    }
    console.log(`Rendered ${entries.length} candidates alongside their exact source positions.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
