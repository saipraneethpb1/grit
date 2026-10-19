// Render a local review page with the unaltered sheets and their exact exercise identity.
// Usage: node scripts/preview-anatomical-demos.mjs /tmp/grit-anatomy-review
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(process.argv[2] ?? '/tmp/grit-anatomy-review');
const atlas = JSON.parse(fs.readFileSync(path.join(root, 'data/exercise-anatomy.json'), 'utf8'));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const entries = Object.entries(atlas).filter(([id]) => fs.existsSync(path.join(root, `assets/anatomy/${id}.webp`)));
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Anatomical demonstrations</title>
<style>body{background:#171514;color:#faf5ef;font:16px system-ui;margin:20px}section{display:inline-block;vertical-align:top;width:610px;margin:6px;border:1px solid #54463e;padding:12px;box-sizing:border-box}h2{font-size:17px;margin:0 0 8px}img{width:100%;display:block}.references{display:flex;margin-top:8px}.references img{width:50%;height:190px;object-fit:contain;background:#fff}small{display:block;margin:6px 0;color:#bea99c}details{margin-top:8px}li{margin:8px 0}</style>
<h1>${entries.length}/${Object.keys(atlas).length} exercise sheets</h1>` + entries.map(([id, entry]) => `<section data-id="${id}" data-status="${entry.status}"><h2>${escape(entry.name)}</h2><small>${escape(entry.sourceId)} · ${entry.status}</small><img src="${pathToFileURL(path.join(root, `assets/anatomy/${id}.webp`))}" alt="${escape(entry.name)}"><div class="references">${[0,1].map(i=>`<img src="${pathToFileURL(path.join(root, `assets/exercises/${id}-${i}.jpg`))}" alt="Source position ${i+1}">`).join('')}</div><details><summary>Instructions</summary><ol>${entry.instructions.map(step => `<li>${escape(step)}</li>`).join('')}</ol></details></section>`).join(''));
console.log(path.join(output, 'index.html'));
