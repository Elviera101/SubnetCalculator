/* Subnet Calculator · Practice page: quick quiz and subnet worksheet */

/* ================= PRACTICE ================= */
const QTYPES = {
  network:{label:'Network address'}, broadcast:{label:'Broadcast address'}, first:{label:'First host'}, last:{label:'Last host'},
  hosts:{label:'Usable hosts'}, mask:{label:'Prefix → mask'}, prefix:{label:'Mask → prefix'}, wildcard:{label:'Wildcard mask'},
  need:{label:'Hosts → prefix'}, same:{label:'Same subnet?'}, count:{label:'Subnet count'}
};
const LEVELS = {easy:[24,30,'Prefixes /24 to /30. Only the last octet changes.'], medium:[16,30,'Prefixes /16 to /30. The third octet comes into play.'], hard:[8,30,'Prefixes /8 to /30, with any octet as the interesting one.']};
let pr = Object.assign({mode:'sheet', level:'easy', types:Object.keys(QTYPES), correct:0, total:0, streak:0, best:0}, LS.get('sc.practice', {}));
let q=null;
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function randIP(){
  const k=rnd(0,4);
  if(k===0) return parseIP(`10.${rnd(0,255)}.${rnd(0,255)}.${rnd(1,254)}`);
  if(k===1) return parseIP(`172.${rnd(16,31)}.${rnd(0,255)}.${rnd(1,254)}`);
  if(k<=3) return parseIP(`192.168.${rnd(0,255)}.${rnd(1,254)}`);
  let o; do{ o=rnd(1,223); }while(o===10||o===127); return parseIP(`${o}.${rnd(0,255)}.${rnd(0,255)}.${rnd(1,254)}`);
}
const C = s => `<code>${s}</code>`;
function makeQ(){
  const types = pr.types.length ? pr.types : Object.keys(QTYPES);
  const type = types[rnd(0,types.length-1)];
  const [lo,hi]=LEVELS[pr.level]; const p=rnd(lo,hi); const ip=randIP(); const c=calc(ip,p);
  const Q={type, kind:'ip'};
  switch(type){
    case 'network': Q.prompt=`What is the network address of ${C(ipStr(ip)+'/'+p)}?`; Q.ans=c.net; Q.why=explainBlock(ip,p); break;
    case 'broadcast': Q.prompt=`What is the broadcast address of ${C(ipStr(ip)+'/'+p)}?`; Q.ans=c.bc; Q.why=explainBlock(ip,p); break;
    case 'first': Q.prompt=`What is the first usable host in ${C(ipStr(ip)+'/'+p)}?`; Q.ans=c.first; Q.why=explainBlock(ip,p)+' The first host is the network address + 1.'; break;
    case 'last': Q.prompt=`What is the last usable host in ${C(ipStr(ip)+'/'+p)}?`; Q.ans=c.last; Q.why=explainBlock(ip,p)+' The last host is the broadcast address − 1.'; break;
    case 'hosts': Q.kind='num'; Q.prompt=`How many usable hosts are in a ${C('/'+p)} subnet?`; Q.ans=c.usable; Q.why=`A /${p} leaves ${32-p} host bits. 2^${32-p} = ${fmt(c.size)} addresses, minus the network and broadcast = ${fmt(c.usable)}.`; break;
    case 'mask': Q.prompt=`What is the subnet mask for ${C('/'+p)}?`; Q.ans=c.mask; Q.why=`${p} one-bits: ${binDots(c.mask)} = ${ipStr(c.mask)}.`; break;
    case 'prefix': Q.kind='prefix'; Q.prompt=`What prefix length matches the mask ${C(ipStr(c.mask))}?`; Q.ans=p; Q.why=`${ipStr(c.mask)} = ${binDots(c.mask)}, which has ${p} one-bits, so /${p}.`; break;
    case 'wildcard': Q.prompt=`What is the wildcard mask for ${C('/'+p)} (${ipStr(c.mask)})?`; Q.ans=c.wild; Q.why=`Subtract each mask octet from 255: 255.255.255.255 − ${ipStr(c.mask)} = ${ipStr(c.wild)}.`; break;
    case 'need': { const np=rnd(Math.max(lo,20),30), h=rnd(2**(32-np-1)-1, 2**(32-np)-2); Q.kind='prefix'; Q.prompt=`What is the smallest subnet (prefix) that holds ${C(fmt(h)+' hosts')}?`; Q.ans=prefixForHosts(h); Q.why=`You need 2^n − 2 ≥ ${fmt(h)}. n = ${32-Q.ans} gives ${fmt(usableOf(Q.ans))} hosts (n = ${31-Q.ans} gives only ${fmt(Math.max(0,2**(31-Q.ans)-2))}). So 32 − ${32-Q.ans} = /${Q.ans}.`; break; }
    case 'same': {
      Q.kind='yn'; const same=Math.random()<.5; let other;
      if(same){ other = c.first + rnd(0, Math.max(0,c.last-c.first)); }
      else { const blk=c.size; other = (c.net + blk*(Math.random()<.5&&c.net>=blk?-1:1) + rnd(1,Math.max(1,blk-2)))>>>0; if(other>MAX) other=c.net-blk+1; }
      if(other===ip) other = c.last;
      Q.ans = ((other & c.mask)>>>0)===c.net ? 'yes':'no';
      Q.prompt=`With mask ${C('/'+p)}, are ${C(ipStr(ip))} and ${C(ipStr(other))} in the same subnet?`;
      Q.why=`${ipStr(ip)} is in ${ipStr(c.net)}/${p}. ${ipStr(other)} is in ${ipStr((other & c.mask)>>>0)}/${p}. ${explainBlock(ip,p)}`; break; }
    case 'count': { const a=rnd(Math.max(lo,8),Math.min(28,hi-2)), b=rnd(a+1,Math.min(30,a+8)); Q.kind='num'; Q.prompt=`How many ${C('/'+b)} subnets fit in a ${C('/'+a)}?`; Q.ans=2**(b-a); Q.why=`${b} − ${a} = ${b-a} borrowed bits. 2^${b-a} = ${fmt(2**(b-a))}.`; break; }
  }
  return Q;
}
function fmtAns(Q){ return Q.kind==='ip'?ipStr(Q.ans):Q.kind==='prefix'?'/'+Q.ans:Q.kind==='yn'?(Q.ans==='yes'?'Yes':'No'):fmt(Q.ans); }
function checkAns(Q,v){
  v=String(v).trim();
  if(Q.kind==='ip'){ const n=parseIP(v); return n===null?null:n===Q.ans; }
  if(Q.kind==='prefix'){ const m=v.match(/^\/?(\d{1,2})$/); if(m) return +m[1]===Q.ans; const n=parseIP(v); if(n!==null&&maskToPrefix(n)!==null) return maskToPrefix(n)===Q.ans; return null; }
  if(Q.kind==='num'){ const s=v.replace(/[,\s_]/g,''); if(!/^\d+$/.test(s)) return null; return +s===Q.ans; }
  return v===Q.ans;
}
function savePr(){ LS.set('sc.practice',pr); }
function renderScore(){
  const acc = pr.total ? Math.round(pr.correct/pr.total*100)+'%' : '—';
  $('#pr-score').innerHTML=[['Score',`${pr.correct} / ${pr.total}`],['Accuracy',acc],['Streak',String(pr.streak)],['Best streak',String(pr.best)]].map(([k,v])=>`<div class="num"><span class="label">${k}</span><b>${v}</b></div>`).join('');
}
function renderPracticeSettings(){
  $$('.lvl-seg button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.level===pr.level));
  $('#pr-level-note').textContent=LEVELS[pr.level][2];
  $('#ws-level-note').textContent='Difficulty: '+LEVELS[pr.level][2];
  $$('#pr-mode button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.mode===pr.mode));
  $('#pr-sheet').hidden = pr.mode!=='sheet'; $('#pr-quiz').hidden = pr.mode!=='quiz';
  $('#pr-types').innerHTML=Object.entries(QTYPES).map(([k,t])=>`<button type="button" data-t="${k}" aria-pressed="${pr.types.includes(k)}">${t.label}</button>`).join('');
}
function newQ(){
  q=makeQ(); q.done=false;
  $('#pr-type').textContent=QTYPES[q.type].label; $('#pr-level-label').textContent=pr.level;
  $('#pr-prompt').innerHTML=q.prompt; $('#pr-feedback').innerHTML='';
  $('#pr-answer-row').hidden = q.kind==='yn'; $('#pr-yesno').hidden = q.kind!=='yn';
  $$('#pr-yesno button').forEach(b=>b.disabled=false);
  const a=$('#pr-answer'); a.value=''; a.disabled=false; a.classList.remove('invalid');
  a.placeholder = q.kind==='ip'?'e.g. 192.168.1.0':q.kind==='prefix'?'e.g. /26':'e.g. 62';
  $('#pr-submit').disabled=false; $('#pr-next').hidden=true; $('#pr-skip').hidden=false;
  if(q.kind!=='yn' && currentView==='practice' && pr.mode==='quiz') a.focus({preventScroll:true});
}
function submitAns(v){
  if(!q || q.done) return;
  const ok=checkAns(q,v);
  if(ok===null){ $('#pr-answer').classList.add('invalid'); $('#pr-feedback').innerHTML=`<div class="feedback bad">That answer isn't in a format I can check. Try something like ${q.kind==='ip'?'10.0.0.0':q.kind==='prefix'?'/26':'62'}.</div>`; return; }
  q.done=true; pr.total++; if(ok){ pr.correct++; pr.streak++; pr.best=Math.max(pr.best,pr.streak); } else pr.streak=0; savePr(); renderScore();
  $('#pr-feedback').innerHTML=`<div class="feedback ${ok?'ok':'bad'}"><div style="margin-bottom:6px">${ok?'<strong>Correct.</strong>':`<strong>Not quite.</strong> The answer is <b>${fmtAns(q)}</b>.`}</div><div>${esc(q.why)}</div></div>`;
  $('#pr-answer').disabled=true; $('#pr-submit').disabled=true; $$('#pr-yesno button').forEach(b=>b.disabled=true);
  $('#pr-next').hidden=false; $('#pr-skip').hidden=true; $('#pr-next').focus({preventScroll:true});
}
$('#pr-form').addEventListener('submit',e=>{ e.preventDefault(); submitAns($('#pr-answer').value); });
$('#pr-yesno').addEventListener('click',e=>{ const b=e.target.closest('[data-yn]'); if(b) submitAns(b.dataset.yn); });
$('#pr-next').onclick=newQ; $('#pr-skip').onclick=newQ;
$('.lvl-seg').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; pr.level=b.dataset.level; savePr(); renderPracticeSettings(); newQ(); wsNew(); });
$('#pr-mode').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; pr.mode=b.dataset.mode; savePr(); renderPracticeSettings(); if(pr.mode==='sheet') wsFocusFirst(); else if(q && !q.done && q.kind!=='yn') $('#pr-answer').focus({preventScroll:true}); });

/* ---------- Subnet worksheet ---------- */
const WS_ROWS=[['net','Network'],['first','First host'],['last','Last host'],['bc','Broadcast'],['next','Next subnet']];
let ws = Object.assign({solved:0,attempted:0,streak:0,best:0,times:[],autofill:false,autocheck:false}, LS.get('sc.sheet',{}));
let wsP=null, wsTick=null;
const saveWs=()=>LS.set('sc.sheet',ws);
const octs = n => [n>>>24,(n>>>16)&255,(n>>>8)&255,n&255];
const mmss = ms => { const s=Math.floor(ms/1000); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
const wsInputs = () => $$('#ws-body input');
const rowInputs = r => $$(`#ws-body tr[data-r="${r}"] input`);
function renderWsScore(){
  const avg = ws.times.length ? mmss(ws.times.reduce((a,b)=>a+b,0)/ws.times.length) : '—';
  const best = ws.times.length ? mmss(Math.min(...ws.times)) : '—';
  $('#ws-score').innerHTML=[['Solved',`${ws.solved} / ${ws.attempted}`],['Clean streak',`${ws.streak} (best ${ws.best})`],['Average time',avg],['Fastest',best]].map(([k,v])=>`<div class="num"><span class="label">${k}</span><b>${v}</b></div>`).join('');
}
function wsInteresting(p){ return p===0 ? 0 : Math.floor((p-1)/8); }
function wsTouched(){ return wsInputs().some(i=>i.value && !i.classList.contains('auto')); }
function wsNew(){
  if(wsP && !wsP.done && wsTouched()){ ws.attempted++; ws.streak=0; saveWs(); }
  const [lo,hi]=LEVELS[pr.level]; let ip,p,c;
  do{ p=rnd(lo,hi); ip=randIP(); c=calc(ip,p); }while(c.next===null);
  wsP={ip,p,c,ans:{net:c.net,first:c.first,last:c.last,bc:c.bc,next:c.next},usedShow:false,done:false,start:Date.now(),stage:0};
  $('#ws-target').textContent = ipStr(ip)+' /'+p;
  $('#ws-body').innerHTML = WS_ROWS.map(([r,l])=>`<tr data-r="${r}"><th scope="row">${l}</th><td><div class="oct4">${[0,1,2,3].map(o=>`<input type="text" inputmode="numeric" maxlength="3" id="ws-${r}-${o}" data-o="${o}" aria-label="${l} octet ${o+1}" autocomplete="off">`).join('<span>.</span>')}</div></td><td class="ws-ok"><span class="muted">—</span></td><td class="ws-ans"></td><td><button class="btn ghost sm" data-show="${r}">Show</button></td></tr>`).join('');
  $('#ws-explain').innerHTML='';
  if(ws.autofill) wsAutofill(true);
  clearInterval(wsTick); $('#ws-timer').textContent='0:00';
  wsTick=setInterval(()=>{ if(wsP && !wsP.done) $('#ws-timer').textContent=mmss(Date.now()-wsP.start); },1000);
  renderWsScore();
  if(currentView==='practice' && pr.mode==='sheet') wsFocusFirst();
}
function wsFocusFirst(){ const i=wsInputs().find(x=>!x.value); if(i) i.focus({preventScroll:true}); }
function wsAutofill(on){
  const k=wsInteresting(wsP.p);
  WS_ROWS.forEach(([r])=>{ const want=octs(wsP.ans[r]); rowInputs(r).forEach((inp,o)=>{
    if(o===k) return;
    if(on && !inp.value){ inp.value=want[o]; inp.classList.add('auto'); }
    if(!on && inp.classList.contains('auto')){ inp.value=''; inp.classList.remove('auto','good','wrong'); }
  }); });
}
function wsCheckRow(r){
  const want=octs(wsP.ans[r]); let all=true;
  rowInputs(r).forEach((inp,o)=>{ const v=inp.value.trim(); const ok = v!=='' && /^\d+$/.test(v) && +v===want[o]; inp.classList.toggle('good',ok); inp.classList.toggle('wrong',!ok); if(!ok) all=false; });
  $(`#ws-body tr[data-r="${r}"] .ws-ok`).innerHTML = all ? '<span class="chip ok">Correct</span>' : '<span class="chip bad">Wrong</span>';
  return all;
}
function wsShowRow(r){ $(`#ws-body tr[data-r="${r}"] .ws-ans`).textContent = ipStr(wsP.ans[r]); if(!wsP.done) wsP.usedShow=true; }
function wsExplain(){
  const c=wsP.c, blk = c.size;
  $('#ws-explain').innerHTML = `<div class="feedback ok" style="background:var(--sunken)">${esc(explainBlock(wsP.ip,wsP.p))} First host = network + 1, last host = broadcast − 1, and the next subnet = network + ${fmt(blk)} addresses${blk>=256?'':` (the next multiple of ${blk} in octet ${wsInteresting(wsP.p)+1})`}.</div>`;
}
function wsFinish(){
  if(wsP.done) return; wsP.done=true; const t=Date.now()-wsP.start; clearInterval(wsTick); $('#ws-timer').textContent=mmss(t);
  ws.attempted++;
  if(!wsP.usedShow){ ws.solved++; ws.streak++; ws.best=Math.max(ws.best,ws.streak); ws.times=[...ws.times,t].slice(-20); }
  else ws.streak=0;
  saveWs(); renderWsScore();
  $('#ws-explain').innerHTML = `<div class="feedback ${wsP.usedShow?'bad':'ok'}">${wsP.usedShow?'All five rows match, but Show was used, so this one doesn\'t count as solved.':`<strong>All five correct in ${mmss(t)}.</strong> Press Enter for the next problem.`}</div>`;
  $('#ws-next').focus({preventScroll:true});
}
function wsCheckAll(){ const ok=WS_ROWS.map(([r])=>wsCheckRow(r)).every(Boolean); wsP.stage=1; if(ok) wsFinish(); return ok; }
function wsShowAll(){ WS_ROWS.forEach(([r])=>wsShowRow(r)); wsP.stage=2; if(!wsP.done){ wsExplain(); } }
function wsEnter(){
  if(wsP.done || wsP.stage>=2) return wsNew();
  if(wsP.stage===0) return wsCheckAll();
  wsShowAll();
}
$('#ws-body').addEventListener('keydown',e=>{
  const inp=e.target; if(inp.tagName!=='INPUT') return;
  const list=wsInputs(), i=list.indexOf(inp);
  if(e.key==='.'||e.key==='/'||e.key===' '){ e.preventDefault(); if(inp.value!=='' || e.key!==' ') { const n=list[i+1]; if(n){ n.focus(); n.select(); } } }
  else if(e.key==='Backspace' && inp.value==='' && i>0){ e.preventDefault(); const pv=list[i-1]; pv.focus(); pv.select(); }
  else if(e.key==='Enter'){ e.preventDefault(); wsEnter(); }
});
$('#ws-body').addEventListener('input',e=>{
  const inp=e.target; if(inp.tagName!=='INPUT') return;
  inp.value=inp.value.replace(/\D/g,'').slice(0,3); inp.classList.remove('auto','good','wrong');
  const tr=inp.closest('tr'); tr.querySelector('.ws-ok').innerHTML='<span class="muted">—</span>';
  if(inp.value.length===3){ const list=wsInputs(); const n=list[list.indexOf(inp)+1]; if(n){ n.focus(); n.select(); } }
  if(ws.autocheck && !wsP.done){
    const r=tr.dataset.r; if(rowInputs(r).every(x=>x.value!=='')) wsCheckRow(r);
    if(WS_ROWS.every(([rr])=>rowInputs(rr).every(x=>x.classList.contains('good')||(x.value!==''&&+x.value===octs(wsP.ans[rr])[+x.dataset.o])))){ WS_ROWS.forEach(([rr])=>wsCheckRow(rr)); wsFinish(); }
  }
});
$('#ws-body').addEventListener('focusin',e=>{ if(e.target.tagName==='INPUT') e.target.select(); });
$('#ws-body').addEventListener('click',e=>{ const b=e.target.closest('[data-show]'); if(b){ wsShowRow(b.dataset.show); } });
$('#ws-checkall').onclick=()=>{ if(!wsP.done) wsCheckAll(); };
$('#ws-showall').onclick=wsShowAll;
$('#ws-next').onclick=wsNew;
$('#ws-next').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); wsNew(); } });
$('#ws-autofill').checked=ws.autofill; $('#ws-autocheck').checked=ws.autocheck;
$('#ws-autofill').onchange=e=>{ ws.autofill=e.target.checked; saveWs(); wsAutofill(ws.autofill); wsFocusFirst(); };
$('#ws-autocheck').onchange=e=>{ ws.autocheck=e.target.checked; saveWs(); };
$('#ws-reset').onclick=()=>{ Object.assign(ws,{solved:0,attempted:0,streak:0,best:0,times:[]}); saveWs(); renderWsScore(); toast('Worksheet stats reset'); };
$('#pr-types').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; const t=b.dataset.t; pr.types = pr.types.includes(t) ? pr.types.filter(x=>x!==t) : [...pr.types,t]; if(!pr.types.length) pr.types=[t]; savePr(); renderPracticeSettings(); if(!pr.types.includes(q.type)) newQ(); });
$('#pr-reset').onclick=()=>{ Object.assign(pr,{correct:0,total:0,streak:0,best:0}); savePr(); renderScore(); toast('Score reset'); };
