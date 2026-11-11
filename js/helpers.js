/* Subnet Calculator · DOM shortcuts, formatting, local storage, toast, clipboard, bit ribbon */

/* ================= helpers ================= */
// Shortcut for document.querySelector.
const $ = (s, r = document) => r.querySelector(s);
// Shortcut for document.querySelectorAll, returned as an array.
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// Escapes text before it is placed inside HTML.
const esc = s =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// Safe wrapper around localStorage (never throws if storage is blocked).
const LS = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
};
let toastTimer;
// Shows a short message at the bottom of the screen.
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}
// Copies text to the clipboard, or selects it so the user can copy by hand.
async function copyText(text, el) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch (e) {
    if (el) {
      el.focus();
      if (el.select) el.select();
      else {
        const r = document.createRange();
        r.selectNodeContents(el);
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
      }
    }
    toast('Press Ctrl/Cmd+C to copy the selected text');
  }
}
// Formats a timestamp as "just now", "5 min ago" and so on.
function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return new Date(t).toLocaleDateString();
}
// Creates a short unique id for saved items.
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Draws the 32-bit ribbon, coloring network, borrowed and host bits.
function renderBits(el, value, prefix, opts = {}) {
  const s = bin32(value);
  const base = opts.base ?? prefix;
  let html = '';
  for (let o = 0; o < 4; o++) {
    html += '<div class="octet">';
    for (let b = 0; b < 8; b++) {
      const i = o * 8 + b,
        one = s[i] === '1';
      const cls = i < base ? 'n' : i < prefix ? 's' : 'h';
      const edge = i === prefix - 1 && prefix < 32 ? ' edge' : '';
      html += `<button type="button" class="bit ${cls}${one ? ' one' : ''}${edge}" data-i="${i}" ${opts.static ? 'tabindex="-1"' : ''} title="Bit ${i + 1} · ${cls === 'n' ? 'network' : cls === 's' ? 'subnet' : 'host'}">${s[i]}</button>`;
    }
    html += '</div>';
  }
  el.innerHTML = html;
}
