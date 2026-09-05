#!/usr/bin/env node
'use strict';

// Small, dependency-free renderer for the Markdown subset used by this handbook.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'docs', 'application.md');
const assets = path.join(root, 'docs', 'assets');
const output = path.join(root, 'docs', 'index.html');
const args = new Set(process.argv.slice(2));
const supported = new Set(['--help', '--open', '--watch']);
for (const arg of args) {
  if (!supported.has(arg)) {
    console.error(`Unknown option: ${arg}. Use --help.`);
    process.exit(1);
  }
}
if (args.has('--help')) {
  console.log('Usage: node scripts/generate-docs.cjs [--open] [--watch]\n\nGenerates docs/index.html from docs/application.md and docs/assets.\n--open   Open the generated file in the default browser.\n--watch  Rebuild on source changes; refresh the browser after rebuilding.');
  process.exit(0);
}

function escape(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function inline(value) {
  // Tokenize before escaping so code and link text cannot become executable HTML.
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*/g;
  let result = '';
  let end = 0;
  for (const match of value.matchAll(pattern)) {
    result += escape(value.slice(end, match.index));
    if (match[1] !== undefined) result += `<code>${escape(match[1])}</code>`;
    else if (match[2] !== undefined) {
      const url = match[3];
      const safe = /^(https?:\/\/|#|\.\.?\/)/i.test(url);
      result += safe ? `<a href="${escape(url)}">${escape(match[2])}</a>` : escape(match[2]);
    } else result += `<strong>${escape(match[4])}</strong>`;
    end = match.index + match[0].length;
  }
  return result + escape(value.slice(end));
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const toc = [];
  const ids = new Map();
  const html = [];
  let sectionOpen = false;
  let title = '';
  const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  const separator = (line) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
  const blockStart = (line) => /^(#{1,6} |```|> |[-*] |\d+\. |\|)/.test(line);
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const heading = line.match(/^(#{1,6}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      if (level === 1) { title = text; i++; continue; }
      const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const count = (ids.get(base) || 0) + 1;
      ids.set(base, count);
      const id = count === 1 ? base : `${base}-${count}`;
      if (level === 2) {
        if (sectionOpen) html.push('</section>');
        html.push(`<section class="chapter" aria-labelledby="${id}">`);
        sectionOpen = true;
      }
      toc.push({ level, text, id });
      html.push(`<h${level} id="${id}"><a class="heading-link" href="#${id}">${inline(text)}</a></h${level}>`);
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      if (i === lines.length) throw new Error('Unclosed code fence in documentation');
      i++;
      html.push(`<div class="code-block"><div class="code-toolbar"><span>${escape(language || 'text')}</span><button type="button" class="copy-button">Copy</button></div><pre><code>${escape(code.join('\n'))}</code></pre></div>`);
      continue;
    }
    if (line.startsWith('|') && lines[i + 1] && separator(lines[i + 1])) {
      const header = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = cells(lines[i++]);
        if (row.length !== header.length) throw new Error(`Table column mismatch near line ${i}`);
        rows.push(`<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`);
      }
      html.push(`<div class="table-scroll" role="region" aria-label="${escape(header.join(', '))} table" tabindex="0"><table><thead><tr>${header.map((cell) => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
      continue;
    }
    if (/^> /.test(line)) {
      const quote = [];
      while (i < lines.length && /^> /.test(lines[i])) quote.push(lines[i++].slice(2));
      html.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }
    const list = line.match(/^([-*]|\d+\.) (.*)$/);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const pattern = ordered ? /^\d+\. (.*)$/ : /^[-*] (.*)$/;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(`<li>${inline(lines[i++].match(pattern)[1])}</li>`);
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !blockStart(lines[i])) paragraph.push(lines[i++]);
    html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  if (sectionOpen) html.push('</section>');
  return { title, toc, body: html.join('\n') };
}

function generate() {
  const markdown = fs.readFileSync(source, 'utf8');
  const { title, toc, body } = renderMarkdown(markdown);
  const css = fs.readFileSync(path.join(assets, 'handbook.css'), 'utf8');
  const js = fs.readFileSync(path.join(assets, 'handbook.js'), 'utf8');
  const chapters = toc.filter((heading) => heading.level === 2);
  const navigation = chapters.map((heading, index) => `<a href="#${heading.id}"><span>${String(index + 1).padStart(2, '0')}</span>${escape(heading.text)}</a>`).join('\n');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="Dentist application handbook: setup, workflows, API, database, operations, and implementation details."><title>${escape(title)}</title><style>${css}</style></head>
<body><a class="skip-link" href="#content">Skip to content</a>
<aside class="sidebar"><a class="brand" href="#top"><span class="brand-icon" aria-hidden="true">D</span><span>Dentist<span class="brand-subtitle">APPLICATION HANDBOOK</span></span></a><label class="search-label" for="search">Find a topic</label><div class="search-box"><input id="search" type="search" placeholder="Search documentation…" autocomplete="off"><kbd>/</kbd></div><p id="search-status" role="status" aria-live="polite">${chapters.length} chapters · available offline</p><nav aria-label="Table of contents">${navigation}</nav><p class="sidebar-footer">Genius Factory<br>Source-based application documentation</p></aside>
<div class="page"><header class="topbar"><span>Documentation <span class="crumb">/ Application guide</span></span><div class="actions"><button id="theme" type="button" aria-pressed="false">Dark mode</button><button id="print" type="button">Print / PDF</button></div></header>
<main id="content"><div class="hero" id="top"><p class="eyebrow">THE APPLICATION, EXPLAINED</p><h1>${escape(title)}</h1><p class="intro">From the first patient profile to the API behind it. A practical guide for clinic teams and the people who build and run the application.</p><div class="hero-meta"><span>${chapters.length} chapters</span><span>17 API endpoints</span><span>3 database tables</span></div><div class="quick-links"><a href="#installation-and-local-setup">Start locally <span aria-hidden="true">↗</span></a><a href="#user-guide-and-page-reference">Explore workflows <span aria-hidden="true">↗</span></a><a href="#api-reference">API reference <span aria-hidden="true">↗</span></a></div></div>
<article>${body}</article><div id="no-results" hidden><h2>No matching chapters</h2><p>Try a different term or clear the search field.</p><button id="clear-search" type="button">Clear search</button></div><footer class="document-footer">Maintained in docs/application.md · Generated with scripts/generate-docs.cjs<a href="#top">Back to top ↑</a></footer></main></div>
<noscript><p class="noscript">All documentation is available below. Search, copy, and appearance controls require JavaScript; use your browser's Find and Print commands.</p></noscript><script>${js}</script></body></html>\n`;
  fs.writeFileSync(output, html, 'utf8');
  console.log(`Generated ${output} (${chapters.length} chapters, ${Buffer.byteLength(html).toLocaleString()} bytes)`);
}

function openDocument() {
  let command;
  let openArgs;
  if (process.platform === 'win32') {
    command = 'powershell.exe';
    // Single-quote a literal path for PowerShell; never interpolate it as code.
    openArgs = ['-NoProfile', '-NonInteractive', '-Command', `Start-Process -FilePath '${output.replace(/'/g, "''")}'`];
  } else {
    command = process.platform === 'darwin' ? 'open' : 'xdg-open';
    openArgs = [output];
  }
  const child = spawn(command, openArgs, { stdio: 'ignore', windowsHide: true });
  child.on('error', (error) => console.error(`Unable to open browser: ${error.message}. Open ${output} manually.`));
  child.on('exit', (code) => { if (code) console.error(`Browser opener exited ${code}. Open ${output} manually.`); });
}

try {
  generate();
  if (args.has('--open')) openDocument();
  if (args.has('--watch')) {
    let timer;
    const files = [source, path.join(assets, 'handbook.css'), path.join(assets, 'handbook.js')];
    for (const file of files) fs.watchFile(file, { interval: 500 }, (current, previous) => {
      if (current.mtimeMs === previous.mtimeMs) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { generate(); } catch (error) { console.error(`Build failed: ${error.message}`); }
      }, 100);
    });
    console.log('Watching handbook source and assets. Refresh the browser after changes. Ctrl+C to stop.');
    process.on('SIGINT', () => { files.forEach((file) => fs.unwatchFile(file)); clearTimeout(timer); process.exit(0); });
  }
} catch (error) {
  console.error(`Documentation generation failed: ${error.message}`);
  process.exitCode = 1;
}
