/* Subnet Calculator · Saved & history page */

/* ================= SAVED & HISTORY ================= */
// Display names for saved item types.
const KIND_LABEL = { calc: 'Subnet', equal: 'Equal split', vlsm: 'VLSM' };
// One-line description of a saved or history item.
function summary(it) {
  if (it.kind === 'calc') return it.data.input;
  if (it.kind === 'equal') return `${it.data.net} ÷ ${it.data.value} ${it.data.mode}`;
  if (it.kind === 'vlsm') return `${it.data.base} · ${(it.data.rows || []).length} subnets`;
  return '';
}
// Opens a saved or history item in its page.
function loadItem(it) {
  const d = it.data || {};
  if (it.kind === 'calc') {
    const r = parseCIDR(d.input);
    if (!r.error) {
      setCalc(r.ip, r.p);
    }
    go('calc');
  } else if (it.kind === 'equal') {
    toast('Equal subnetting is turned off for now');
  } else if (it.kind === 'vlsm') {
    $('#v-base').value = d.base;
    vRows = (d.rows || []).map(r => ({ name: String(r.name), hosts: +r.hosts }));
    renderVRows();
    renderVLSM();
    go('vlsm');
  }
}
// Draws the Saved list.
function renderSaved() {
  $('#saved-count').textContent = Saved.items.length;
  $('#saved-where').textContent = Saved.col
    ? 'Saved to your account, visible only to you.'
    : 'Saved in this browser.';
  $('#saved-list').innerHTML = Saved.items.length
    ? Saved.items
        .map(
          it =>
            `<div class="item" data-id="${esc(it.id)}"><div class="t"><span class="chip ${it.kind === 'vlsm' ? 'sub' : 'net'}" style="margin-bottom:4px">${KIND_LABEL[it.kind] || it.kind}</span><b>${esc(it.name)}</b><span class="small muted">${esc(summary(it))} · ${timeAgo(it.at)}</span></div><div class="acts"><button class="btn sm" data-act="open">Open</button><button class="btn ghost sm" data-act="rename">Rename</button><button class="btn ghost sm danger" data-act="del">Delete</button></div></div>`
        )
        .join('')
    : '<div class="empty">Nothing saved yet. Use Save on the Calculator or VLSM planner.</div>';
}
// Draws the History list.
function renderHistory() {
  $('#hist-list').innerHTML = history.length
    ? history
        .map(
          h =>
            `<div class="item" data-id="${h.id}"><div class="t"><b>${esc(h.label)}</b><span class="small muted">${KIND_LABEL[h.kind]} · ${timeAgo(h.at)}</span></div><div class="acts"><button class="btn sm" data-act="open">Open</button><button class="btn ghost sm" data-act="save">Save</button></div></div>`
        )
        .join('')
    : '<div class="empty">Calculations you run appear here.</div>';
}
// Draws the Recent list beside the calculator.
function renderRecent() {
  const items = history.filter(h => h.kind === 'calc').slice(0, 6);
  $('#calc-recent').innerHTML = items.length
    ? items
        .map(
          h =>
            `<div class="item" data-id="${h.id}"><div class="t"><b>${esc(h.label)}</b><span class="small muted">${timeAgo(h.at)}</span></div><div class="acts"><button class="btn ghost sm" data-act="open">Open</button></div></div>`
        )
        .join('')
    : '<div class="empty">Try 10.0.0.0/8, 172.16.5.4 255.255.240.0 or 203.0.113.9/29.</div>';
}
$('#saved-list').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const row = b.closest('.item');
  const it = Saved.items.find(x => x.id === row.dataset.id);
  if (!it) return;
  if (b.dataset.act === 'open') loadItem(it);
  if (b.dataset.act === 'del') {
    if (b.dataset.confirm) {
      Saved.remove(it);
    } else {
      b.dataset.confirm = '1';
      b.textContent = 'Confirm delete';
      setTimeout(() => {
        if (b.isConnected) {
          delete b.dataset.confirm;
          b.textContent = 'Delete';
        }
      }, 3000);
    }
  }
  if (b.dataset.act === 'rename') {
    openModal(
      'Rename',
      `<form id="rn-form" style="display:grid;gap:12px"><div class="field"><label class="label" for="rn-name">Name</label><input type="text" id="rn-name" value="${esc(it.name)}" maxlength="80"></div><div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit">Rename</button></div></form>`
    );
    $('#rn-name').select();
    $('#rn-form').onsubmit = ev => {
      ev.preventDefault();
      const n = $('#rn-name').value.trim();
      if (n) Saved.rename(it, n);
      closeModal();
    };
  }
});
// Handles Open and Save clicks in History and Recent.
function histClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const h = history.find(x => x.id === b.closest('.item').dataset.id);
  if (!h) return;
  if (b.dataset.act === 'open') loadItem(h);
  if (b.dataset.act === 'save') openSave(h.kind, h.label, h.data);
}
$('#hist-list').addEventListener('click', histClick);
$('#calc-recent').addEventListener('click', histClick);
$('#hist-clear').onclick = e => {
  const b = e.currentTarget;
  if (!b.dataset.confirm) {
    b.dataset.confirm = '1';
    b.textContent = 'Confirm clear';
    setTimeout(() => {
      delete b.dataset.confirm;
      b.textContent = 'Clear';
    }, 3000);
    return;
  }
  delete b.dataset.confirm;
  b.textContent = 'Clear';
  history = [];
  LS.set('sc.history', history);
  renderHistory();
  renderRecent();
  toast('History cleared');
};
$('#saved-export').onclick = () => {
  if (!Saved.items.length) return toast('Nothing saved yet');
  const sections = [
    {
      heading: 'Saved calculations',
      table: {
        head: ['Name', 'Type', 'Input', 'Saved'],
        rows: Saved.items.map(it => [
          it.name,
          KIND_LABEL[it.kind] || it.kind,
          summary(it),
          new Date(it.at).toLocaleString()
        ])
      }
    }
  ];
  Saved.items.forEach(it => {
    if (it.kind === 'calc') {
      const r = parseCIDR(it.data.input);
      if (r.error) return;
      const c = calc(r.ip, r.p);
      sections.push({
        heading: it.name,
        kv: [
          ['Network', ipStr(c.net) + '/' + c.p],
          ['Mask', ipStr(c.mask)],
          ['Host range', ipStr(c.first) + ' – ' + ipStr(c.last)],
          ['Broadcast', ipStr(c.bc)],
          ['Usable hosts', fmt(c.usable)]
        ]
      });
    }
  });
  openExport({ title: 'Saved subnet calculations', sections });
};
