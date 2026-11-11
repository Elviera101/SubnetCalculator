/* Subnet Calculator · Modal dialogs, export formats (CSV, Markdown, text, HTML report), save dialog */

/* ================= modal / export ================= */
let downloads = null;
// Opens the shared dialog with a title and HTML body.
function openModal(title, bodyHTML) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHTML;
  $('#modal').hidden = false;
  const f = $('#modal-body input, #modal-body button');
  if (f) f.focus();
}
// Closes the shared dialog.
function closeModal() {
  $('#modal').hidden = true;
}
$('#modal-close').onclick = closeModal;
$('#modal').addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
});

// Quotes a CSV value when it contains commas, quotes or new lines.
function csvCell(v) {
  v = String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
// Normalises an export into a list of sections.
function sectionsOf(ex) {
  return ex.sections || [{ kv: ex.kv, table: ex.table }];
}
// Builds the CSV export.
function toCSV(ex) {
  const out = [];
  sectionsOf(ex).forEach((s, i) => {
    if (i) out.push('');
    if (s.heading) out.push(csvCell(s.heading));
    if (s.kv) {
      out.push('Field,Value');
      s.kv.forEach(([k, v]) => out.push(csvCell(k) + ',' + csvCell(v)));
    }
    if (s.table) {
      out.push(s.table.head.map(csvCell).join(','));
      s.table.rows.forEach(r => out.push(r.map(csvCell).join(',')));
    }
  });
  return out.join('\n');
}
// Builds the plain-text export with aligned columns.
function toText(ex) {
  const out = [ex.title, '='.repeat(ex.title.length), ''];
  sectionsOf(ex).forEach(s => {
    if (s.heading) {
      out.push(s.heading, '-'.repeat(s.heading.length));
    }
    if (s.kv) {
      const w = Math.max(...s.kv.map(r => r[0].length));
      s.kv.forEach(([k, v]) => out.push(k.padEnd(w + 2) + v));
    }
    if (s.table) {
      const all = [s.table.head, ...s.table.rows];
      const w = s.table.head.map((_, i) => Math.max(...all.map(r => String(r[i]).length)));
      all.forEach((r, ri) => {
        out.push(
          r
            .map((c, i) => String(c).padEnd(w[i]))
            .join('  ')
            .trimEnd()
        );
        if (ri === 0) out.push(w.map(x => '-'.repeat(x)).join('  '));
      });
    }
    out.push('');
  });
  if (ex.notes) out.push(ex.notes);
  return out.join('\n');
}
// Builds the Markdown export.
function toMD(ex) {
  const out = ['# ' + ex.title, ''];
  sectionsOf(ex).forEach(s => {
    if (s.heading) out.push('## ' + s.heading, '');
    if (s.kv) {
      out.push('| Field | Value |', '|---|---|');
      s.kv.forEach(([k, v]) => out.push(`| ${k} | \`${v}\` |`));
      out.push('');
    }
    if (s.table) {
      out.push(
        '| ' + s.table.head.join(' | ') + ' |',
        '|' + s.table.head.map(() => '---').join('|') + '|'
      );
      s.table.rows.forEach(r => out.push('| ' + r.join(' | ') + ' |'));
      out.push('');
    }
  });
  if (ex.notes) out.push(ex.notes);
  return out.join('\n');
}
// Builds the standalone printable HTML report.
function toHTML(ex) {
  let body = '';
  sectionsOf(ex).forEach(s => {
    if (s.heading) body += `<h2>${esc(s.heading)}</h2>`;
    if (s.kv)
      body +=
        '<table class="kv">' +
        s.kv.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('') +
        '</table>';
    if (s.table)
      body +=
        '<table><thead><tr>' +
        s.table.head.map(h => `<th>${esc(h)}</th>`).join('') +
        '</tr></thead><tbody>' +
        s.table.rows
          .map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>')
          .join('') +
        '</tbody></table>';
  });
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(ex.title)}</title>
<style>body{font:14px/1.5 -apple-system,"Segoe UI",Inter,sans-serif;color:#131a2b;max-width:900px;margin:32px auto;padding:0 20px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}.meta{color:#596277;margin-bottom:20px}table{border-collapse:collapse;width:100%;margin-bottom:8px}th,td{border:1px solid #d6dce7;padding:6px 9px;text-align:left;font-family:"JetBrains Mono",Menlo,Consolas,monospace;font-size:12.5px}thead th{background:#e8ecf3;font-family:inherit;font-size:11px;text-transform:uppercase;letter-spacing:.06em}table.kv th{width:34%;background:#f1f3f7;font-family:inherit;font-size:13px}.tip{color:#596277;font-size:12px;margin-top:24px}@media print{.tip{display:none}body{margin:0}}</style></head>
<body><h1>${esc(ex.title)}</h1><p class="meta">Generated ${new Date().toLocaleString()} · Subnet Calculator</p>${body}${ex.notes ? `<p>${esc(ex.notes)}</p>` : ''}<p class="tip">Use your browser's Print command (Ctrl/Cmd+P) to print this report or save it as PDF.</p></body></html>`;
}
// Saves a text file through a normal browser download (used on GitHub Pages).
function browserDownload(name, text) {
  const types = { csv: 'text/csv', md: 'text/markdown', txt: 'text/plain', html: 'text/html' };
  const type = (types[name.split('.').pop()] || 'text/plain') + ';charset=utf-8';
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
  }, 1000);
  toast('Downloaded');
}

// Turns a title into a safe file name.
function slug(s) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'subnet'
  );
}
// Opens the Export dialog with download, print and copy options.
function openExport(ex) {
  const fname = slug(ex.title);
  const dl = true;
  openModal(
    'Export · ' + ex.title,
    `
    ${
      dl
        ? `<div><span class="label">Download a file</span><div class="row" style="margin-top:6px">
      <button class="btn" data-dl="csv">CSV</button><button class="btn" data-dl="md">Markdown</button><button class="btn" data-dl="txt">Plain text</button><button class="btn primary" data-dl="html">Printable report (.html)</button>${downloads ? '' : '<button class="btn" id="ex-print">Print</button>'}</div>
      <p class="note" style="margin-top:6px">Open the printable report in your browser and print it or save it as PDF.</p></div>`
        : `<p class="note">File downloads aren't available in this view. Copy the export instead.</p>`
    }
    <div><span class="label">Copy to clipboard</span><div class="row" style="margin-top:6px">
      <button class="btn" data-cp="txt">Text</button><button class="btn" data-cp="csv">CSV</button><button class="btn" data-cp="md">Markdown</button></div></div>
    <pre class="preview" id="ex-preview" tabindex="0">${esc(toText(ex))}</pre>`
  );
  const gen = { csv: toCSV, md: toMD, txt: toText, html: toHTML };
  $$('#modal-body [data-dl]').forEach(
    b =>
      (b.onclick = async () => {
        const f = b.dataset.dl;
        try {
          if (!downloads) {
            browserDownload(`${fname}.${f}`, gen[f](ex));
            return;
          }
          await downloads.save({ filename: `${fname}.${f}`, data: gen[f](ex) });
          toast('Downloaded');
        } catch (e) {
          if (e && e.code === 'declined') return;
          if (e && e.code === 'rate_limited') toast('A save prompt is already open');
          else toast('Download unavailable here. Use Copy instead.');
        }
      })
  );
  // Print: open the HTML report in a new window and start printing
  const pb = $('#ex-print');
  if (pb)
    pb.onclick = () => {
      const w = window.open('', '_blank');
      if (!w) {
        toast('Allow pop-ups to print');
        return;
      }
      w.document.write(toHTML(ex));
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    };
  $$('#modal-body [data-cp]').forEach(
    b =>
      (b.onclick = () => {
        const t = gen[b.dataset.cp](ex);
        $('#ex-preview').textContent = t;
        copyText(t, $('#ex-preview'));
      })
  );
}
// Opens the "Save calculation" dialog.
function openSave(kind, defName, data) {
  openModal(
    'Save calculation',
    `
    <form id="save-form" style="display:grid;gap:12px">
      <div class="field"><label class="label" for="save-name">Name</label><input type="text" id="save-name" value="${esc(defName)}" maxlength="80"></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" id="save-cancel">Cancel</button><button class="btn primary" type="submit">Save</button></div>
    </form>`
  );
  const inp = $('#save-name');
  inp.select();
  $('#save-cancel').onclick = closeModal;
  $('#save-form').onsubmit = e => {
    e.preventDefault();
    Saved.add(kind, inp.value.trim() || defName, data);
    closeModal();
  };
}
