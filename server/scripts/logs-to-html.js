const fs = require('fs');
const path = require('path');

const defaultLogFile = path.join(__dirname, '..', 'logs', 'app.log');
const watch = process.argv.includes('--watch');
const args = process.argv.slice(2).filter((arg) => arg !== '--watch');
const inputFile = args[0] ? path.resolve(args[0]) : defaultLogFile;
const outputFile = args[1] ? path.resolve(args[1]) : path.join(__dirname, '..', 'logs', 'app.html');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readLogs(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { timestamp: '', level: 'info', message: line };
      }
    });
}

function render() {
  const logs = readLogs(inputFile).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const rows = logs.map((entry) => {
    const meta = { ...entry };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;

    return `<tr class="level-${escapeHtml(entry.level)}">
      <td>${escapeHtml(entry.timestamp)}</td>
      <td><span>${escapeHtml(entry.level)}</span></td>
      <td>${escapeHtml(entry.message)}</td>
      <td><pre>${escapeHtml(JSON.stringify(meta, null, 2))}</pre></td>
    </tr>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="2">
  <title>Backend Logs</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f7fafc; color: #0f172a; }
    main { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    p { margin: 0 0 22px; color: #475569; }
    table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 8px rgba(15, 23, 42, 0.08); }
    th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { background: #0f172a; color: #fff; position: sticky; top: 0; }
    td:nth-child(1) { width: 220px; white-space: nowrap; }
    td:nth-child(2) { width: 90px; text-transform: uppercase; font-weight: 700; }
    td:nth-child(3) { width: 320px; }
    span { display: inline-block; border-radius: 4px; padding: 3px 7px; background: #e2e8f0; }
    .level-error span { background: #fee2e2; color: #991b1b; }
    .level-warn span { background: #fef3c7; color: #92400e; }
    .level-info span { background: #dbeafe; color: #1e40af; }
    .level-debug span { background: #dcfce7; color: #166534; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; }
    .empty { padding: 24px; background: #fff; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <main>
    <h1>Backend Logs</h1>
    <p>${logs.length} entries from ${escapeHtml(inputFile)}</p>
    ${logs.length ? `<table>
      <thead>
        <tr><th>Time</th><th>Level</th><th>Message</th><th>Details</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">No logs found yet.</div>'}
  </main>
</body>
</html>
`;

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html);
  console.log(`Wrote ${outputFile}`);
}

render();

if (watch) {
  fs.mkdirSync(path.dirname(inputFile), { recursive: true });
  if (!fs.existsSync(inputFile)) fs.writeFileSync(inputFile, '');

  let timer = null;
  fs.watch(inputFile, () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  });
  console.log(`Watching ${inputFile}`);
}
