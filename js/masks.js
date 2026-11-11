/* Subnet Calculator · Mask converter page */

/* ================= MASKS ================= */
let maskP = 22;
// Reads a prefix, mask, wildcard or host count and returns {p, from} or {error}.
function parseMaskAny(s) {
  s = s.trim().toLowerCase();
  if (!s) return { error: 'Enter a prefix, mask, wildcard or host count.' };
  let m;
  if ((m = s.match(/^\/?(\d{1,2})$/))) {
    const p = +m[1];
    return p <= 32
      ? { p, from: 'Read as a CIDR prefix' }
      : { error: 'A prefix must be between 0 and 32.' };
  }
  if ((m = s.match(/^([\d,]+)\s*(hosts?|h)$/))) {
    const h = +m[1].replace(/,/g, '');
    const p = prefixForHosts(h);
    return p === null
      ? { error: 'That is more hosts than IPv4 can hold.' }
      : { p, from: `Smallest subnet with at least ${fmt(h)} usable hosts` };
  }
  const n = parseIP(s);
  if (n === null) return { error: 'Try /22, 255.255.252.0, 0.0.3.255 or 500 hosts.' };
  const pm = maskToPrefix(n);
  if (pm !== null) return { p: pm, from: 'Read as a subnet mask' };
  const pw = maskToPrefix(~n >>> 0);
  if (pw !== null) return { p: pw, from: 'Read as a wildcard mask' };
  return { error: `${s} is not a valid mask. The 1 bits must be contiguous from the left.` };
}
// All mask facts for a prefix (used by Export).
function maskKV(p) {
  const m = maskOf(p),
    w = wildOf(p);
  const per24 = p <= 24 ? `${fmt(2 ** (24 - p))} × /24` : `1/${2 ** (p - 24)} of a /24`;
  return [
    ['CIDR prefix', '/' + p],
    ['Subnet mask', ipStr(m)],
    ['Wildcard mask', ipStr(w)],
    ['Mask in binary', binDots(m)],
    ['Mask in hex', hex(m)],
    ['Total addresses', fmt(2 ** (32 - p))],
    ['Usable hosts', fmt(usableOf(p))],
    ['Network bits / host bits', `${p} / ${32 - p}`],
    ['Size in /24 blocks', per24]
  ];
}
// Label for what the user typed: CIDR, MASK, WILDCARD or HOSTS.
function maskKind(r) {
  return /CIDR/.test(r.from)
    ? 'CIDR'
    : /hosts/.test(r.from)
      ? 'HOSTS'
      : /wildcard/.test(r.from)
        ? 'WILDCARD'
        : 'MASK';
}
// Explains the interesting octet and block size for a prefix.
function maskBlockNote(p) {
  if (p === 0) return 'A /0 covers every IPv4 address.';
  if (p === 32) return 'A /32 is a single address, often used for one host or a loopback.';
  if (p % 8 === 0)
    return `/${p} ends on an octet boundary. Each subnet is ${fmt(2 ** (32 - p))} addresses, so network addresses step by 1 in octet ${p / 8}.`;
  const k = Math.floor(p / 8),
    mo = (maskOf(p) >>> (24 - 8 * k)) & 255,
    blk = 256 - mo;
  const starts = [];
  for (let v = 0; v < 256 && starts.length < 4; v += blk) starts.push(v);
  return `Octet ${k + 1} is the interesting octet (${mo}). Block size = 256 − ${mo} = ${blk}, so networks start at ${starts.join(', ')}${256 / blk > 4 ? ` … ${256 - blk}` : ''} in that octet.`;
}
// Redraws the Mask converter: tiles, slider, bit ribbon and table highlight.
function renderMask() {
  const box = $('#mask-in').closest('.cv-box');
  const r = parseMaskAny($('#mask-in').value);
  box.classList.toggle('invalid', !!r.error);
  $('#mask-err').hidden = !r.error;
  $('#mask-err').textContent = r.error || '';
  if (r.error) return;
  const p = r.p,
    m = maskOf(p),
    w = wildOf(p);
  maskP = p;
  $('#mask-kind').textContent = maskKind(r);
  $('#mask-detected').textContent = r.from + '.';
  $('#mask-slider').value = p;
  $('#mask-slider-out').textContent = `/${p} · ${ipStr(m)}`;
  $('#mask-tiles').innerHTML = [
    ['Prefix', '/' + p],
    ['Subnet mask', ipStr(m)],
    ['Wildcard mask', ipStr(w)],
    ['Usable hosts', fmt(usableOf(p))]
  ]
    .map(
      ([k, v], i) =>
        `<button type="button" class="tile${i === 0 ? ' lead' : ''}" data-copy="${v}"><span class="label">${k}</span><b>${v}</b><small>Click to copy</small></button>`
    )
    .join('');
  renderBits($('#mask-bits'), m, p, { static: true });
  $('#mask-block').textContent = maskBlockNote(p);
  $$('#mask-table tbody tr').forEach(tr => tr.classList.toggle('sel', +tr.dataset.p === p));
  const sel = $(`#mask-table tr[data-p="${p}"]`),
    wrap = $('#mask-table-wrap');
  if (sel && wrap)
    wrap.scrollTop = Math.max(0, sel.offsetTop - wrap.clientHeight / 2 + sel.offsetHeight / 2);
}
// Rows for the /32 to /0 prefix reference table.
function maskTableRows() {
  const rows = [];
  for (let p = 32; p >= 0; p--)
    rows.push(['/' + p, ipStr(maskOf(p)), ipStr(wildOf(p)), fmt(2 ** (32 - p)), fmt(usableOf(p))]);
  return rows;
}
$('#mask-table').innerHTML =
  '<thead><tr><th>Prefix</th><th>Subnet mask</th><th>Wildcard</th><th class="r">Addresses</th><th class="r">Usable hosts</th></tr></thead><tbody>' +
  maskTableRows()
    .map(
      r =>
        `<tr class="click" data-p="${r[0].slice(1)}"><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="mono r">${r[3]}</td><td class="mono r">${r[4]}</td></tr>`
    )
    .join('') +
  '</tbody>';
$('#mask-table').addEventListener('click', e => {
  const tr = e.target.closest('tr[data-p]');
  if (!tr) return;
  $('#mask-in').value = '/' + tr.dataset.p;
  renderMask();
  $('.mk-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#mask-slider').addEventListener('input', e => {
  $('#mask-in').value = '/' + e.target.value;
  renderMask();
});
$('#mask-tiles').addEventListener('click', e => {
  const t = e.target.closest('[data-copy]');
  if (t) copyText(t.dataset.copy, t.querySelector('b'));
});
const MASK_EXAMPLES = ['/8', '/16', '/24', '/26', '/30', '255.255.240.0', '0.0.0.63', '500 hosts'];
$('#mask-examples').insertAdjacentHTML(
  'beforeend',
  MASK_EXAMPLES.map(v => `<button type="button" data-mex="${v}">${v}</button>`).join('')
);
$('#mask-examples').addEventListener('click', e => {
  const b = e.target.closest('[data-mex]');
  if (!b) return;
  $('#mask-in').value = b.dataset.mex;
  renderMask();
});
$('#mask-in').addEventListener('input', renderMask);
$('#mask-export').onclick = () =>
  openExport({
    title: 'IPv4 prefix reference',
    table: {
      head: ['Prefix', 'Subnet mask', 'Wildcard', 'Addresses', 'Usable hosts'],
      rows: maskTableRows()
    }
  });
