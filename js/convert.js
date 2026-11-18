/* Subnet Calculator · Number conversion page (decimal, binary, hexadecimal) */

/* ================= NUMBER CONVERSION ================= */
// Superscript helper for powers (2⁸, 16²).
const SUP = k => `<sup>${k}</sup>`;
// A number as uppercase hex digits without a prefix.
const HEXD = n => n.toString(16).toUpperCase();
let cvVal = 200,
  cvMethod = 'sub',
  cvSrc = 'dec',
  cvTab = 'd2b';
// Reads a decimal, binary or hex string and returns {n} or {error}.
function parseBase(raw, base) {
  let s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s,_]/g, '');
  if (base === 2) {
    s = s.replace(/^0b/, '').replace(/\./g, '');
    if (!/^[01]+$/.test(s)) return { error: 'Binary uses only the digits 0 and 1.' };
    if (s.length > 32) return { error: 'Keep binary to 32 bits or fewer.' };
    return { n: parseInt(s, 2) };
  }
  if (base === 16) {
    s = s.replace(/^0x/, '').replace(/\./g, '');
    if (!/^[0-9a-f]+$/.test(s))
      return { error: 'Hexadecimal uses the digits 0–9 and the letters A–F.' };
    if (s.length > 8) return { error: 'Keep hex to 8 digits (32 bits) or fewer.' };
    return { n: parseInt(s, 16) };
  }
  if (!/^\d+$/.test(s)) return { error: 'Decimal uses only the digits 0–9.' };
  const n = Number(s);
  if (n > MAX) return { error: 'Keep decimal at 4,294,967,295 (32 bits) or less.' };
  return { n };
}
// Bit width to display: 8, 16 or 32 bits.
const widthOf = n => (n <= 255 ? 8 : n <= 65535 ? 16 : 32);
// A number as binary, padded to a width.
const bitsOf = (n, w) => n.toString(2).padStart(w, '0');
// Groups binary digits in fours ("1100 1000").
const nibbles = b => b.match(/.{4}/g).join(' ');
const CV_TAB_FOR = { dec: 'd2b', bin: 'b2d', hex: 'h2d' };
// Syncs the three boxes after one changes, then redraws place values and working.
function renderConvert(from) {
  const bases = { dec: 10, bin: 2, hex: 16 };
  if (from) {
    const el = $('#cv-' + from),
      box = el.closest('.cv-box');
    if (el.value.trim() === '') {
      box.classList.remove('invalid');
      $('#cv-err').hidden = true;
      return;
    }
    const r = parseBase(el.value, bases[from]);
    box.classList.toggle('invalid', !!r.error);
    $('#cv-err').hidden = !r.error;
    $('#cv-err').textContent = r.error || '';
    if (r.error) return;
    cvVal = r.n;
    cvSrc = from;
    cvTab = CV_TAB_FOR[from];
  } else {
    $$('#v-convert .cv-inputs .cv-box').forEach(b => b.classList.remove('invalid'));
    $('#cv-err').hidden = true;
  }
  const n = cvVal,
    w = widthOf(n),
    b = bitsOf(n, w);
  if (from !== 'dec') $('#cv-dec').value = String(n);
  if (from !== 'bin') $('#cv-bin').value = nibbles(b);
  if (from !== 'hex') $('#cv-hex').value = HEXD(n).padStart(w / 4, '0');
  $$('#v-convert .cv-field').forEach(f => f.classList.toggle('src', f.dataset.base === cvSrc));

  let ph = '';
  for (let o = 0; o < w / 8; o++) {
    ph += '<div class="place">';
    for (let j = 0; j < 8; j++) {
      const i = o * 8 + j,
        k = w - 1 - i,
        v = 2 ** k,
        on = b[i] === '1';
      ph += `<button type="button" data-k="${k}" aria-pressed="${on}" aria-label="Bit worth ${fmt(v)}, ${on ? 'on' : 'off'}" title="2^${k} = ${fmt(v)}"><small>${w === 8 ? v : '2' + SUP(k)}</small><b>${on ? 1 : 0}</b></button>`;
    }
    ph += '</div>';
  }
  $('#oct-place').innerHTML = ph;
  $('#cv-width').textContent = `${w} bits`;
  const ones = [];
  for (let i = 0; i < w; i++) if (b[i] === '1') ones.push(2 ** (w - 1 - i));
  $('#cv-sum').innerHTML = ones.length
    ? `${ones.map(fmt).join(' + ')} = <b>${fmt(n)}</b>`
    : 'All bits off = <b>0</b>';
  renderWork();
}
// HTML for the highlighted answer strip under each method.
function answer(label, value) {
  return `<div class="cv-answer"><span class="label">${label}</span><b>${value}</b></div>`;
}
// Draws the step-by-step working for the selected conversion method.
function renderWork() {
  $$('#cv-tabs button').forEach(t =>
    t.setAttribute('aria-selected', String(t.dataset.w === cvTab))
  );
  const n = cvVal,
    w = widthOf(n),
    b = bitsOf(n, w),
    hx = HEXD(n);
  let html = '';
  if (cvTab === 'd2b') {
    html += `<div class="seg" style="margin-bottom:14px"><button type="button" data-m="sub" aria-pressed="${cvMethod === 'sub'}">Subtract place values</button><button type="button" data-m="div" aria-pressed="${cvMethod === 'div'}">Divide by 2</button></div>`;
    if (cvMethod === 'sub') {
      let rem = n,
        rows = '';
      for (let i = 0; i < w; i++) {
        const k = w - 1 - i,
          v = 2 ** k,
          fits = rem >= v;
        rows += `<tr class="${fits ? 'hit' : 'skip'}"><td class="mono r">${fmt(v)}</td><td class="mono r">${fmt(rem)}</td><td class="small">${fits ? `${fmt(rem)} − ${fmt(v)} = ${fmt(rem - v)}` : `${fmt(rem)} is less than ${fmt(v)}`}</td><td class="mono r"><b>${fits ? 1 : 0}</b></td></tr>`;
        if (fits) rem -= v;
      }
      html += `<div class="work-grid"><div class="tbl-wrap tbl-scroll" style="max-height:380px"><table><thead><tr><th class="r">Place</th><th class="r">Left</th><th>Step</th><th class="r">Bit</th></tr></thead><tbody>${rows}</tbody></table></div>
        <ol class="work-steps"><li>List the place values from ${fmt(2 ** (w - 1))} down to 1.</li><li>If what's left is at least the place value, write <b>1</b> and subtract it.</li><li>Otherwise write <b>0</b> and move on.</li><li>Read the bits from top to bottom.</li></ol></div>${answer('Binary', nibbles(b))}`;
    } else {
      let x = n;
      const list = [];
      if (x === 0) list.push([0, 0, 0]);
      while (x > 0) {
        list.push([x, Math.floor(x / 2), x % 2]);
        x = Math.floor(x / 2);
      }
      const raw = n.toString(2);
      html += `<div class="work-grid"><div class="tbl-wrap tbl-scroll" style="max-height:380px"><table><thead><tr><th class="r">Divide</th><th class="r">Result</th><th class="r">Remainder</th></tr></thead><tbody>${list.map(([a, q, r]) => `<tr><td class="mono r">${fmt(a)} ÷ 2</td><td class="mono r">${fmt(q)}</td><td class="mono r"><b>${r}</b></td></tr>`).join('')}</tbody></table></div>
        <ol class="work-steps"><li>Divide by 2 and write down the remainder (0 or 1).</li><li>Keep dividing the result until it reaches 0.</li><li>Read the remainders from <b>bottom to top</b>: ${raw}.</li>${raw.length < w ? `<li>Pad with zeros on the left to ${w} bits.</li>` : ''}</ol></div>${answer('Binary', nibbles(b))}`;
    }
  } else if (cvTab === 'b2d') {
    let head = '',
      row = '';
    for (let i = 0; i < w; i++) {
      const k = w - 1 - i;
      head += `<th class="r">${w === 8 ? 2 ** k : '2' + SUP(k)}</th>`;
      row += `<td class="mono r ${b[i] === '1' ? 'on' : ''}">${b[i]}</td>`;
    }
    const ones = [];
    for (let i = 0; i < w; i++) if (b[i] === '1') ones.push(2 ** (w - 1 - i));
    html += `<ol class="work-steps" style="margin-bottom:12px"><li>Write the place value over each bit, doubling from 1 on the right.</li><li>Add up the place values that sit over a <b>1</b>.</li></ol>
      <div class="tbl-wrap"><table><thead><tr>${head}</tr></thead><tbody><tr>${row}</tr></tbody></table></div>
      <p class="sum">${ones.length ? ones.map(fmt).join(' + ') : 'No bits are on'}</p>${answer('Decimal', fmt(n))}`;
  } else if (cvTab === 'b2h') {
    const groups = b.match(/.{4}/g);
    html += `<ol class="work-steps" style="margin-bottom:12px"><li>Split the bits into groups of four from the right. Each group is a nibble.</li><li>Inside a nibble the place values are 8, 4, 2, 1. Add them up.</li><li>Swap each total for its hex digit (10 = A … 15 = F). Going back to binary is the same in reverse.</li></ol>
      <div class="groups">${groups
        .map(g => {
          const v = parseInt(g, 2);
          return `<div class="grp"><span>${g}</span><span class="muted">${[8, 4, 2, 1].filter((p, i) => g[i] === '1').join('+') || '0'} = ${v}</span><b>${HEXD(v)}</b></div>`;
        })
        .join('')}</div>
      ${answer('Hexadecimal', '0x' + groups.map(g => HEXD(parseInt(g, 2))).join(''))}`;
  } else if (cvTab === 'd2h') {
    let x = n;
    const hl = [];
    if (x === 0) hl.push([0, 0, 0]);
    while (x > 0) {
      hl.push([x, Math.floor(x / 16), x % 16]);
      x = Math.floor(x / 16);
    }
    html += `<div class="work-grid"><div class="tbl-wrap"><table><thead><tr><th class="r">Divide</th><th class="r">Result</th><th class="r">Remainder</th><th class="r">Hex digit</th></tr></thead><tbody>${hl.map(([a, q, r]) => `<tr><td class="mono r">${fmt(a)} ÷ 16</td><td class="mono r">${fmt(q)}</td><td class="mono r">${r}</td><td class="mono r on">${HEXD(r)}</td></tr>`).join('')}</tbody></table></div>
      <ol class="work-steps"><li>Divide by 16 and write down the remainder.</li><li>Turn each remainder into a hex digit (10 = A, 11 = B … 15 = F).</li><li>Keep going until the result is 0, then read the digits from <b>bottom to top</b>.</li></ol></div>${answer('Hexadecimal', '0x' + hx)}`;
  } else {
    const digits = hx.split(''),
      L = digits.length;
    const rows = digits
      .map((d, i) => {
        const p = L - 1 - i,
          v = parseInt(d, 16);
        return `<tr><td class="mono r on">${d}</td><td class="mono r">${v}</td><td class="mono r">16${SUP(p)} = ${fmt(16 ** p)}</td><td class="mono r">${fmt(v * 16 ** p)}</td></tr>`;
      })
      .join('');
    html += `<div class="work-grid"><div class="tbl-wrap"><table><thead><tr><th class="r">Digit</th><th class="r">Value</th><th class="r">Place</th><th class="r">Digit × place</th></tr></thead><tbody>${rows}</tbody></table></div>
      <ol class="work-steps"><li>Turn each hex digit into its value (A = 10 … F = 15).</li><li>Multiply by its place: 1, 16, 256, 4,096 … from the right.</li><li>Add the results.</li></ol></div>
      <p class="sum">${digits.map((d, i) => fmt(parseInt(d, 16) * 16 ** (L - 1 - i))).join(' + ')}</p>${answer('Decimal', fmt(n))}`;
  }
  $('#cv-work').innerHTML = html;
}
['dec', 'bin', 'hex'].forEach(k => $('#cv-' + k).addEventListener('input', () => renderConvert(k)));
$('#oct-place').addEventListener('click', e => {
  const b = e.target.closest('button[data-k]');
  if (!b) return;
  cvVal = (cvVal ^ (2 ** +b.dataset.k)) >>> 0;
  renderConvert();
});
$('#cv-tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-w]');
  if (!b) return;
  cvTab = b.dataset.w;
  renderWork();
});
$('#cv-tabs').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const t = $$('#cv-tabs button');
  const i = t.findIndex(x => x.dataset.w === cvTab);
  const n = t[(i + (e.key === 'ArrowRight' ? 1 : t.length - 1)) % t.length];
  cvTab = n.dataset.w;
  renderWork();
  n.focus();
});
$('#cv-work').addEventListener('click', e => {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  cvMethod = b.dataset.m;
  renderWork();
});
$('#v-convert').addEventListener('click', e => {
  const c = e.target.closest('[data-copy]');
  if (!c) return;
  const inp = $('#cv-' + c.dataset.copy);
  const v = inp.value.replace(/\s+/g, '');
  copyText(c.dataset.copy === 'hex' ? '0x' + v : c.dataset.copy === 'bin' ? v : v, inp);
});
const CV_EXAMPLES = [10, 127, 192, 255, 256, 1000, 1024, 65535];
$('#cv-examples').insertAdjacentHTML(
  'beforeend',
  CV_EXAMPLES.map(v => `<button type="button" data-ex="${v}">${fmt(v)}</button>`).join('')
);
$('#cv-examples').addEventListener('click', e => {
  const b = e.target.closest('[data-ex]');
  if (!b) return;
  cvVal = +b.dataset.ex;
  cvSrc = 'dec';
  cvTab = 'd2b';
  renderConvert();
});
// Loads a number into the converter and scrolls to it.
function cvLoad(n) {
  cvVal = n;
  cvSrc = 'dec';
  cvTab = 'd2b';
  renderConvert();
  $('.cv-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// IP address conversion
function renderCvIP() {
  const n = parseIP($('#cv-ip').value);
  $('#cv-ip')
    .closest('.cv-box')
    .classList.toggle('invalid', n === null);
  if (n === null) return;
  const o = ipStr(n).split('.').map(Number);
  $('#cv-ip-table').innerHTML =
    '<thead><tr><th>Octet</th><th class="r">Decimal</th><th>Binary</th><th>Hex</th><th></th></tr></thead><tbody>' +
    o
      .map(
        (v, i) =>
          `<tr><td>${i + 1}</td><td class="mono r">${v}</td><td class="mono">${bitsOf(v, 8)}</td><td class="mono">${HEXD(v).padStart(2, '0')}</td><td><button class="btn ghost sm" data-load="${v}">Show working</button></td></tr>`
      )
      .join('') +
    '</tbody>';
  $('#cv-ip-kv').innerHTML = [
    ['Dotted decimal', ipStr(n)],
    ['Dotted binary', binDots(n)],
    ['Dotted hex', o.map(v => HEXD(v).padStart(2, '0')).join('.')],
    ['32-bit integer', String(n)],
    ['Hex', hex(n)]
  ]
    .map(([k, v]) => `<div><dt>${k}</dt><dd class="copyable" title="Click to copy">${v}</dd></div>`)
    .join('');
}
$('#cv-ip').addEventListener('input', renderCvIP);
$('#cv-ip-table').addEventListener('click', e => {
  const b = e.target.closest('[data-load]');
  if (b) cvLoad(+b.dataset.load);
});
$('#cv-ip-kv').addEventListener('click', e => {
  const d = e.target.closest('dd');
  if (d) copyText(d.textContent, d);
});

// reference
$('#cv-nibbles').innerHTML = Array.from(
  { length: 16 },
  (_, v) =>
    `<button type="button" class="nib" data-load="${v}"><b>${HEXD(v)}</b><span>${bitsOf(v, 4)}</span><span>${v}</span></button>`
).join('');
$('#cv-nibbles').addEventListener('click', e => {
  const b = e.target.closest('[data-load]');
  if (b) cvLoad(+b.dataset.load);
});
$('#cv-masks').innerHTML =
  '<thead><tr><th>Bits on</th>' +
  [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => `<th class="r">${k}</th>`).join('') +
  '</tr></thead><tbody>' +
  [
    ['Decimal', v => v],
    ['Binary', v => bitsOf(v, 8)],
    ['Hex', v => HEXD(v).padStart(2, '0')]
  ]
    .map(
      ([l, f]) =>
        `<tr><td>${l}</td>${[8]
          .map(k => {
            const v = k === 0 ? 0 : (0xff << (8 - k)) & 255;
            return `<td class="mono r">${f(v)}</td>`;
          })
          .join('')}</tr>`
    )
    .join('') +
  '</tbody>';

// drill
const CV_TYPES = [
  ['decimal', 'binary', 10, 2],
  ['binary', 'decimal', 2, 10],
  ['decimal', 'hexadecimal', 10, 16],
  ['hexadecimal', 'decimal', 16, 10],
  ['binary', 'hexadecimal', 2, 16],
  ['hexadecimal', 'binary', 16, 2]
];
let cvs = Object.assign({ correct: 0, total: 0, streak: 0 }, LS.get('sc.convert', {}));
let cq = null;
// Writes a 0-255 value in base 10, 2 or 16 for the drill.
const inBase = (n, base) =>
  base === 2 ? bitsOf(n, 8) : base === 16 ? HEXD(n).padStart(2, '0') : String(n);
// Updates the drill score chip.
function cvScore() {
  $('#cv-score').textContent = `${cvs.correct}/${cvs.total} · streak ${cvs.streak}`;
}
// Creates a new conversion drill question.
function cvNewQ() {
  const t = CV_TYPES[rnd(0, CV_TYPES.length - 1)];
  const pool = [0, 128, 192, 224, 240, 248, 252, 254, 255];
  const n = Math.random() < 0.35 ? pool[rnd(0, pool.length - 1)] : rnd(0, 255);
  cq = { t, n, done: false };
  $('#cv-prompt').innerHTML = `Convert <code>${inBase(n, t[2])}</code> from ${t[0]} to ${t[1]}.`;
  $('#cv-ans').value = '';
  $('#cv-ans').disabled = false;
  $('#cv-check').disabled = false;
  $('#cv-ans').classList.remove('invalid');
  $('#cv-ans').placeholder = t[3] === 2 ? 'e.g. 11000000' : t[3] === 16 ? 'e.g. C0' : 'e.g. 192';
  $('#cv-feedback').innerHTML = '';
}
// Short explanation shown after a drill answer.
function cvWorking(n) {
  const b = bitsOf(n, 8),
    ones = [];
  for (let i = 0; i < 8; i++) if (b[i] === '1') ones.push(2 ** (7 - i));
  const hi = b.slice(0, 4),
    lo = b.slice(4);
  return `${ones.length ? ones.join(' + ') + ' = ' + n : 'No bits on = 0'}. Binary ${b}. Nibbles ${hi} = ${HEXD(parseInt(hi, 2))} and ${lo} = ${HEXD(parseInt(lo, 2))}, so hex ${HEXD(n).padStart(2, '0')}.`;
}
$('#cv-form').addEventListener('submit', e => {
  e.preventDefault();
  if (!cq) return;
  if (cq.done) {
    cvNewQ();
    $('#cv-ans').focus();
    return;
  }
  const r = parseBase($('#cv-ans').value, cq.t[3]);
  if ($('#cv-ans').value.trim() === '' || r.error) {
    $('#cv-ans').classList.add('invalid');
    $('#cv-feedback').innerHTML =
      `<div class="feedback bad">${esc(r.error || 'Type an answer first.')}</div>`;
    return;
  }
  const ok = r.n === cq.n;
  cq.done = true;
  cvs.total++;
  if (ok) {
    cvs.correct++;
    cvs.streak++;
  } else cvs.streak = 0;
  LS.set('sc.convert', cvs);
  cvScore();
  $('#cv-ans').disabled = true;
  $('#cv-check').disabled = true;
  $('#cv-feedback').innerHTML =
    `<div class="feedback ${ok ? 'ok' : 'bad'}"><div style="margin-bottom:6px">${ok ? '<strong>Correct.</strong>' : `<strong>Not quite.</strong> The answer is <b>${inBase(cq.n, cq.t[3])}</b>.`}</div><div>${esc(cvWorking(cq.n))}</div><button class="btn sm" type="button" data-load="${cq.n}" style="margin-top:8px">Show full working</button></div>`;
  $('#cv-next').focus();
});
$('#cv-next').onclick = () => {
  cvNewQ();
  $('#cv-ans').focus();
};
$('#cv-feedback').addEventListener('click', e => {
  const b = e.target.closest('[data-load]');
  if (b) cvLoad(+b.dataset.load);
});
