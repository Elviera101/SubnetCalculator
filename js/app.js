/* Subnet Calculator · App shell: sidebar, page header, theme, routing and start-up */

/* ================= app chrome ================= */
// Section label, title and description for each page header.
const PAGE_META = {
  calc: [
    'Calculate',
    'Subnet calculator',
    'Type an address with a prefix or mask, like 192.168.10.77/26.'
  ],
  vlsm: ['Plan', 'VLSM planner', 'Fit subnets of different sizes into one address block.'],
  saved: ['Library', 'Saved & history', 'Reopen saved calculations and recent work.']
};
// Buttons each page shows in the header.
const PAGE_ACTIONS = { calc: ['calc-export', 'calc-save'], vlsm: ['v-export', 'v-save'] };
const actGroups = {};
Object.entries(PAGE_ACTIONS).forEach(([v, ids]) => {
  const g = document.createElement('div');
  g.className = 'tb-group';
  g.hidden = true;
  ids.forEach(id => {
    const b = $('#' + id);
    if (b) g.appendChild(b);
  });
  $('#top-actions').appendChild(g);
  actGroups[v] = g;
});
// Updates the page header and its buttons for the current page.
function setChrome(v) {
  const m = PAGE_META[v] || PAGE_META.calc;
  $('#pg-eyebrow').textContent = m[0];
  $('#pg-title').textContent = m[1];
  $('#pg-desc').textContent = m[2];
  Object.entries(actGroups).forEach(([k, g]) => (g.hidden = k !== v));
}
// Opens or closes the sidebar on small screens.
function setNav(open) {
  $('.app').classList.toggle('nav-open', open);
  $('#scrim').hidden = !open;
  $('#menu-btn').setAttribute('aria-expanded', String(open));
  if (open) {
    const a = $('.nav-item[aria-current="page"]') || $('.nav-item');
    a.focus();
  }
}
$('#menu-btn').onclick = () => setNav(true);
$('#scrim').onclick = () => setNav(false);
// Main input for each page (used by the / shortcut).
const FOCUS = { calc: '#calc-in', vlsm: '#v-base' };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.app').classList.contains('nav-open')) {
    setNav(false);
    $('#menu-btn').focus();
    return;
  }
  if (
    e.key === '/' &&
    !e.metaKey &&
    !e.ctrlKey &&
    !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) &&
    $('#modal').hidden
  ) {
    const el = FOCUS[currentView] ? $(FOCUS[currentView]) : null;
    if (el && !el.disabled) {
      e.preventDefault();
      el.focus();
      if (el.select) el.select();
    }
  }
});
// theme switch for the standalone site; inside claude.ai the viewer controls the theme
(function () {
  if (window.claude && typeof window.claude.use === 'function') return;
  const btn = $('#theme-btn');
  btn.hidden = false;
  const modes = ['system', 'light', 'dark'],
    names = { system: 'System', light: 'Light', dark: 'Dark' };
  let mode = LS.get('sc.theme', 'system');
  if (!modes.includes(mode)) mode = 'system';
  const apply = () => {
    if (mode === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    $('#theme-label').textContent = names[mode];
  };
  btn.onclick = () => {
    mode = modes[(modes.indexOf(mode) + 1) % 3];
    LS.set('sc.theme', mode);
    apply();
  };
  apply();
})();

/* ================= routing ================= */
// Valid page names for the address bar (#calc, #vlsm, ...).
const VIEWS = ['calc', 'vlsm', 'saved'];
let currentView = 'calc';
// Navigates to a page by changing the URL hash.
function go(v) {
  if (location.hash !== '#' + v) location.hash = v;
  else show(v);
}
// Shows one page, hides the others and updates the sidebar.
function show(v) {
  if (!VIEWS.includes(v)) v = 'calc';
  currentView = v;
  const changed = currentView !== v || !$('#v-' + v) || $('#v-' + v).hidden;
  $$('.view').forEach(s => (s.hidden = s.dataset.view !== v));
  if (changed) window.scrollTo(0, 0);
  $$('.nav-item').forEach(t => {
    if (t.dataset.view === v) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  setChrome(v);
  if (v === 'saved') {
    renderHistory();
    renderSaved();
  }
  try {
    LS.set('sc.view', v);
  } catch (e) {}
}
$$('.nav-item').forEach(
  t =>
    (t.onclick = () => {
      go(t.dataset.view);
      setNav(false);
    })
);
document.addEventListener('click', e => {
  const g = e.target.closest('[data-goto]');
  if (g) go(g.dataset.goto);
});
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

/* ================= boot ================= */
(function boot() {
  const r = parseCIDR($('#calc-in').value);
  state.ip = r.ip;
  state.p = r.p;
  renderCalc();
  renderVRows();
  renderVLSM();
  renderHistory();
  renderRecent();
  renderSaved();
  show(location.hash.slice(1) || 'calc');
  booting = false;
  Saved.init();
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude
      .use('downloads')
      .then(d => {
        downloads = d;
      })
      .catch(() => {});
  }
})();
