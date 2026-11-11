/* Subnet Calculator · Subnet calculator page */

/* ================= CALCULATOR ================= */
// Current calculator input: address and prefix length.
const state = { ip: parseIP('192.168.10.77'), p: 26 };
// Updates the calculator state, re-renders the page and logs it to History.
function setCalc(ip, p, { from } = {}) {
  state.ip = ip;
  state.p = p;
  const txt = ipStr(ip) + '/' + p;
  if (from !== 'calc-in') $('#calc-in').value = txt;
  $('#calc-in').classList.remove('invalid');
  $('#calc-err').hidden = true;
  renderCalc();
  logHistory('calc', txt, { input: txt });
}
// Every calculator value (used by Export).
function calcKV() {
  const c = calc(state.ip, state.p);
  return [
    ['IP address', ipStr(c.ip)],
    ['CIDR notation', ipStr(c.net) + '/' + c.p],
    ['Network address', ipStr(c.net)],
    ['Broadcast address', ipStr(c.bc)],
    ['First usable host', ipStr(c.first)],
    ['Last usable host', ipStr(c.last)],
    [
      'Usable hosts',
      fmt(c.usable) +
        (c.p === 31 ? ' (point-to-point, RFC 3021)' : c.p === 32 ? ' (single host)' : '')
    ],
    ['Total addresses', fmt(c.size)],
    ['Subnet mask', ipStr(c.mask)],
    ['Wildcard mask', ipStr(c.wild)],
    ['Prefix length', '/' + c.p],
    ['Address class', classOf(c.ip)],
    ['Address type', typeOf(c.ip)],
    ['Reverse DNS zone', reverseZone(c.net, c.p)],
    ['Previous subnet', c.prev === null ? '—' : ipStr(c.prev) + '/' + c.p],
    ['Next subnet', c.next === null ? '—' : ipStr(c.next) + '/' + c.p],
    ['IP as integer', fmt(c.ip).replace(/,/g, '')],
    ['IP in hex', hex(c.ip)],
    ['IP in binary', binDots(c.ip)],
    ['Mask in binary', binDots(c.mask)]
  ];
}
// The short list shown in the Details panel.
function calcKVShort() {
  const c = calc(state.ip, state.p);
  return [
    ['Subnet mask', ipStr(c.mask)],
    ['Wildcard mask', ipStr(c.wild)],
    ['First usable host', ipStr(c.first)],
    ['Last usable host', ipStr(c.last)],
    ['Broadcast address', ipStr(c.bc)],
    ['Total addresses', fmt(c.size)],
    ['Previous subnet', c.prev === null ? '—' : ipStr(c.prev) + '/' + c.p],
    ['Next subnet', c.next === null ? '—' : ipStr(c.next) + '/' + c.p]
  ];
}
// Redraws the calculator: slider, bit ribbon, network card and details.
function renderCalc() {
  const c = calc(state.ip, state.p);
  $('#calc-prefix').value = c.p;
  $('#calc-prefix-out').textContent = `/${c.p} · ${ipStr(c.mask)}`;
  renderBits($('#calc-bits'), c.ip, c.p);
  const range =
    c.p >= 31 || c.first >>> 8 !== c.last >>> 8
      ? `${ipStr(c.first)} – ${ipStr(c.last)}`
      : `${ipStr(c.first)} – .${c.last & 255}`;
  $('#calc-hero').innerHTML =
    `<div class="hero-main"><span class="eyebrow">Network</span><div class="hero-cidr"><strong>${ipStr(c.net)}</strong><span>/${c.p}</span></div><p>Hosts ${range} · Broadcast ${ipStr(c.bc)}</p><div class="hero-tags"><span>Mask ${ipStr(c.mask)}</span><span>Class ${esc(classOf(c.ip))}</span></div></div><div class="hero-hosts"><span>Usable hosts</span><strong>${fmt(c.usable)}</strong><small>${fmt(c.size)} total addresses</small></div>`;
  $('#calc-kv').innerHTML = calcKVShort()
    .map(
      ([k, v]) =>
        `<div><dt>${k}</dt><dd class="copyable" title="Click to copy">${esc(v)}</dd></div>`
    )
    .join('');
}
$('#calc-in').addEventListener('input', e => {
  const r = parseCIDR(e.target.value);
  if (r.error) {
    e.target.classList.add('invalid');
    $('#calc-err').textContent = r.error;
    $('#calc-err').hidden = false;
    return;
  }
  setCalc(r.ip, r.p, { from: 'calc-in' });
});
$('#calc-in').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const r = parseCIDR(e.target.value);
    if (!r.error) e.target.value = ipStr(r.ip) + '/' + r.p;
  }
});
$('#calc-prefix').addEventListener('input', e => setCalc(state.ip, +e.target.value));
$('#calc-bits').addEventListener('click', e => {
  const b = e.target.closest('.bit');
  if (!b) return;
  const i = +b.dataset.i;
  setCalc(state.ip, i + 1 === state.p ? i : i + 1);
});
$('#calc-kv').addEventListener('click', e => {
  const d = e.target.closest('dd');
  if (d) copyText(d.textContent, d);
});
$('#calc-save').onclick = () => {
  const c = calc(state.ip, state.p);
  const t = ipStr(state.ip) + '/' + state.p;
  openSave('calc', `${ipStr(c.net)}/${c.p} subnet`, { input: t });
};
$('#calc-export').onclick = () => {
  const c = calc(state.ip, state.p);
  openExport({ title: `Subnet ${ipStr(c.net)}/${c.p}`, kv: calcKV() });
};
