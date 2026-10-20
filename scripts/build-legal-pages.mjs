/**
 * Writes the public privacy policy and terms (docs/, served by GitHub Pages)
 * from the same text the app shows in /legal, so the two can never disagree.
 * Run after editing src/domain/legalContent.ts: npm run build:legal
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '../src/domain/legalContent';

const escape = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain-text policy → headings (short lines followed by content), bullet lists and paragraphs. */
function toHtml(text) {
  const [title, ...rest] = text.split('\n');
  const blocks = rest.join('\n').trim().split(/\n\s*\n/);
  const body = blocks.map((block) => {
    const lines = block.split('\n');
    const out = [];
    let i = 0;
    if (lines.length > 1 && !lines[0].startsWith('•') && lines[0].length < 40) out.push(`<h2>${escape(lines[i++])}</h2>`);
    const restLines = lines.slice(i);
    if (restLines.every((l) => l.startsWith('•'))) {
      out.push(`<ul>${restLines.map((l) => `<li>${escape(l.replace(/^•\s*/, ''))}</li>`).join('')}</ul>`);
    } else if (restLines.length) {
      out.push(...restLines.map((l) => (l.startsWith('•') ? `<ul><li>${escape(l.replace(/^•\s*/, ''))}</li></ul>` : `<p>${escape(l)}</p>`)));
    }
    return out.join('\n');
  }).join('\n');
  return { title, body };
}

const page = (t) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(t.title)}</title>
<style>
  :root { color-scheme: dark; --bg: #0e0f16; --text: #e9eaf0; --muted: #a0a3b5; --violet: #8b7cff; --rule: #232636; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 20px 64px; }
  a { color: var(--violet); }
  .brand { color: var(--violet); font-weight: 600; letter-spacing: .18em; font-size: 12px; text-transform: uppercase; }
  h1 { font-size: 30px; line-height: 1.2; margin: 12px 0 8px; font-weight: 500; }
  h2 { font-size: 18px; margin: 32px 0 6px; font-weight: 600; }
  p, li { color: var(--muted); }
  ul { padding-left: 20px; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--rule); color: var(--muted); font-size: 14px; }
</style>
</head>
<body><main>
<div class="brand">Ryvora</div>
<h1>${escape(t.title.replace(/\s+—\s+Ryvora$/, ''))}</h1>
${t.body}
<footer><a href="./privacy.html">Privacy Policy</a> · <a href="./terms.html">Terms of Service</a></footer>
</main></body>
</html>
`;

mkdirSync('docs', { recursive: true });
writeFileSync('docs/privacy.html', page(toHtml(PRIVACY_POLICY)));
writeFileSync('docs/terms.html', page(toHtml(TERMS_OF_SERVICE)));
writeFileSync('docs/index.html', `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./privacy.html"><title>Ryvora</title><a href="./privacy.html">Privacy Policy</a>`);
// GitHub Pages would otherwise run Jekyll over the folder.
writeFileSync('docs/.nojekyll', '');
console.log('Wrote docs/privacy.html, docs/terms.html, docs/index.html');
