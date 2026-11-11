/* Subnet Calculator · VLSM planner page */

/* ================= VLSM ================= */
const V_PRESETS = {
  'Company': {base:'10.20.0.0/22', rows:[['Engineering',250],['Sales',120],['Guest Wi-Fi',60],['Servers',28],['Printers',12],['WAN link A',2],['WAN link B',2]]},
  'Small office': {base:'192.168.1.0/24', rows:[['Staff',60],['Guest Wi-Fi',30],['Cameras',12],['Printers',10],['Management',6]]},
  'Campus': {base:'172.16.0.0/20', rows:[['Students',1000],['Guest Wi-Fi',500],['Faculty',400],['Library',200],['Admin',100],['Servers',50]]},
  'WAN links': {base:'10.255.0.0/26', rows:[['Link 1',2],['Link 2',2],['Link 3',2],['Link 4',2],['Link 5',2],['Link 6',2]]},
};
let vRows = V_PRESETS['Company'].rows.map(([name,hosts])=>({name,hosts}));
let vResult=null;
const VPAL=['--c1','--c2','--c3','--c4','--c5','--c6','--c7','--c8'];
const vColor = i => `var(${VPAL[i%VPAL.length]})`;
function renderVRows(){
  $('#v-rows').innerHTML = vRows.length ? vRows.map((r,i)=>`<div class="vrow" data-i="${i}" style="--c:${vColor(i)}"><span class="swatch" aria-hidden="true"></span><input type="text" data-i="${i}" data-k="name" id="v-name-${i}" value="${esc(r.name)}" aria-label="Subnet ${i+1} name"><input type="number" class="mono" min="1" data-i="${i}" data-k="hosts" id="v-hosts-${i}" value="${r.hosts}" aria-label="Hosts needed for ${esc(r.name)}"><span class="need" id="v-need-${i}"></span><button type="button" class="x" data-del="${i}" aria-label="Remove ${esc(r.name)}">×</button></div>`).join('')
    : '<div class="empty" style="margin-top:10px">No subnets yet. Add one, or load an example above.</div>';
}
function computeVLSM(){
  const r=parseCIDR($('#v-base').value); if(r.error) return {error:r.error};
  const base=calc(r.ip,r.p);
  const reqs=vRows.map((x,i)=>({...x,i,hosts:Math.floor(+x.hosts)})).filter(x=>x.hosts>=1);
  const bad=reqs.find(x=>prefixForHosts(x.hosts)===null); if(bad) return {error:`${bad.name} needs more hosts than IPv4 can hold.`};
  const sorted=[...reqs].sort((a,b)=>b.hosts-a.hosts || a.i-b.i);
  let cur=base.net; const alloc=[]; let overflow=null;
  for(const x of sorted){
    const p=prefixForHosts(x.hosts), size=2**(32-p);
    if(p<r.p || cur+size-1>base.bc){ overflow=overflow||x; alloc.push({...x,p,fail:true}); continue; }
    const c=calc(cur,p); alloc.push({...x,p,c}); cur+=size;
  }
  const used=cur-base.net;
  const needed=sorted.reduce((s,x)=>s+2**(32-prefixForHosts(x.hosts)),0);
  return {base,p:r.p,alloc,used,overflow,needed,free: cur<=base.bc ? rangeToCidrs(cur,base.bc) : [], normalized:base.net!==r.ip};
}
function vlsmTable(res){
  return res.alloc.map(a=> a.fail ? [a.name, fmt(a.hosts), '/'+a.p, 'Does not fit','','','',''] :
    [a.name, fmt(a.hosts), fmt(a.c.usable), ipStr(a.c.net)+'/'+a.p, ipStr(a.c.mask), `${ipStr(a.c.first)} – ${ipStr(a.c.last)}`, ipStr(a.c.bc), fmt(a.c.usable-a.hosts)]);
}
function renderVLSM(){
  const res=computeVLSM(); vResult=res;
  $('#v-base').closest('.cv-box').classList.toggle('invalid',!!res.error);
  vRows.forEach((r,i)=>{ const el=$('#v-need-'+i); if(!el) return; const h=Math.floor(+r.hosts); const p=h>=1?prefixForHosts(h):null;
    el.textContent = p===null ? '—' : `/${p} · ${fmt(usableOf(p))} hosts`;
    el.title = p===null ? 'Enter a host count of 1 or more' : `Smallest subnet with at least ${fmt(h)} usable hosts`; });
  if(res.error){
    $('#v-err').hidden=false; $('#v-err').textContent=res.error; $('#v-base-info').textContent='';
    $('#v-status').innerHTML=''; $('#v-hero').innerHTML=''; $('#v-map').innerHTML=''; $('#v-ticks').innerHTML=''; $('#v-free').innerHTML=''; $('#v-table').innerHTML='';
    return;
  }
  const total=res.base.size, used=res.used, free=total-used, placed=res.alloc.filter(a=>!a.fail);
  const failed=new Set(res.alloc.filter(a=>a.fail).map(a=>a.i));
  $$('#v-rows .vrow').forEach(el=>el.classList.toggle('fail', failed.has(+el.dataset.i)));
  $('#v-base-info').textContent=`/${res.p} · ${fmt(total)} addresses`;
  $('#v-err').hidden=!res.normalized; $('#v-err').textContent=res.normalized?`Host bits were set, so ${ipStr(res.base.net)}/${res.p} is used.`:'';

  if(!vRows.length) $('#v-status').innerHTML='<span class="chip">Add a subnet to start</span>';
  else if(res.overflow){
    const np=Math.max(0,32-Math.ceil(Math.log2(res.needed))); const sug=(res.base.net & maskOf(np))>>>0;
    $('#v-status').innerHTML=`<span class="chip bad">Too small: the plan needs ${fmt(res.needed)} addresses</span><button type="button" class="btn sm" data-suggest="${ipStr(sug)}/${np}">Use ${ipStr(sug)}/${np}</button>`;
  } else $('#v-status').innerHTML=`<span class="chip ok">Everything fits in /${res.p}</span>${free?`<span class="chip">${fmt(free)} addresses left over</span>`:''}`;

  const reqHosts=placed.reduce((s,a)=>s+a.hosts,0);
  $('#v-hero').innerHTML=[['Allocated',`${fmt(used)} of ${fmt(total)}`],['Free',fmt(free)],['Subnets placed',`${placed.length} of ${res.alloc.length}`],['Host efficiency', used?Math.round(reqHosts/used*100)+'%':'—']]
    .map(([k,v])=>`<div class="num"><span class="label">${k}</span><b>${v}</b></div>`).join('');

  $('#v-map').innerHTML = placed.map(a=>{ const pct=a.c.size/total*100; return `<span style="width:${pct}%;--c:${vColor(a.i)}" title="${esc(a.name)} · ${ipStr(a.c.net)}/${a.p}"><em>${pct>=8?esc(a.name):''}</em></span>`; }).join('')
    + (free>0 ? `<span class="free" style="width:${free/total*100}%" title="Free · ${fmt(free)} addresses"><em>${free/total>=.08?'Free':''}</em></span>` : '');
  $('#v-ticks').innerHTML=`<span>${ipStr(res.base.net)}</span><span>${ipStr(res.base.bc)}</span>`;
  $('#v-free').innerHTML = res.free.length ? `<span class="label">Free blocks you can still use</span><div class="chips" style="margin-top:6px">${res.free.slice(0,10).map(f=>`<span class="chip">${ipStr(f.net)}/${f.p}</span>`).join('')}${res.free.length>10?`<span class="chip">+${res.free.length-10} more</span>`:''}</div>` : '';

  $('#v-table').innerHTML='<thead><tr><th>Subnet</th><th class="r">Hosts</th><th>Network</th><th>Host range</th><th>Broadcast</th><th>Usage</th></tr></thead><tbody>'+
    (res.alloc.length ? res.alloc.map(a=>{ const sw=`<span class="sw" style="--c:${vColor(a.i)}"></span>`;
      if(a.fail) return `<tr class="fail"><td>${sw}${esc(a.name)}</td><td class="mono r">${fmt(a.hosts)}</td><td class="mono">/${a.p}</td><td colspan="3">Does not fit in this block</td></tr>`;
      const pct=Math.round(a.hosts/a.c.usable*100);
      return `<tr class="click" data-net="${ipStr(a.c.net)}/${a.p}"><td>${sw}${esc(a.name)}</td><td class="mono r">${fmt(a.hosts)}</td><td class="mono">${ipStr(a.c.net)}/${a.p}</td><td class="mono">${ipStr(a.c.first)} – ${ipStr(a.c.last)}</td><td class="mono">${ipStr(a.c.bc)}</td><td><span class="usage" style="--c:${vColor(a.i)}"><i style="width:${pct}%"></i></span><span class="mono small">${fmt(a.hosts)}/${fmt(a.c.usable)}</span></td></tr>`; }).join('')
    : '<tr><td colspan="6" class="muted">Your plan appears here.</td></tr>')+'</tbody>';
  logHistory('vlsm', `VLSM ${ipStr(res.base.net)}/${res.p} · ${vRows.length} subnets`, vData());
}
function vData(){ return {base:$('#v-base').value.trim(), rows:vRows.map(r=>({name:r.name,hosts:+r.hosts}))}; }
function vAddRow(){ vRows.push({name:'Subnet '+(vRows.length+1),hosts:10}); renderVRows(); renderVLSM(); const n=$(`#v-name-${vRows.length-1}`); n.focus(); n.select(); }
$('#v-rows').addEventListener('input',e=>{ const t=e.target; if(t.dataset.i===undefined) return; vRows[+t.dataset.i][t.dataset.k] = t.dataset.k==='hosts' ? +t.value : t.value; renderVLSM(); });
$('#v-rows').addEventListener('keydown',e=>{
  const t=e.target; if(e.key!=='Enter' || t.dataset.i===undefined) return; e.preventDefault();
  const i=+t.dataset.i;
  if(t.dataset.k==='name') $(`#v-hosts-${i}`).select();
  else if(i===vRows.length-1) vAddRow();
  else { const n=$(`#v-name-${i+1}`); n.focus(); n.select(); }
});
$('#v-rows').addEventListener('click',e=>{ const b=e.target.closest('[data-del]'); if(!b) return; vRows.splice(+b.dataset.del,1); renderVRows(); renderVLSM(); });
$('#v-add').onclick=vAddRow;
$('#v-clear').onclick=e=>{ const b=e.currentTarget; if(!b.dataset.confirm){ b.dataset.confirm='1'; b.textContent='Confirm clear'; setTimeout(()=>{ if(b.dataset.confirm){ delete b.dataset.confirm; b.textContent='Clear all'; } },3000); return; } delete b.dataset.confirm; b.textContent='Clear all'; vRows=[]; renderVRows(); renderVLSM(); };
$('#v-base').addEventListener('input',renderVLSM);
$('#v-presets').insertAdjacentHTML('beforeend', Object.keys(V_PRESETS).map(k=>`<button type="button" data-preset="${k}">${k}</button>`).join(''));
$('#v-presets').addEventListener('click',e=>{ const b=e.target.closest('[data-preset]'); if(!b) return; const p=V_PRESETS[b.dataset.preset]; $('#v-base').value=p.base; vRows=p.rows.map(([name,hosts])=>({name,hosts})); renderVRows(); renderVLSM(); });
$('#v-status').addEventListener('click',e=>{ const b=e.target.closest('[data-suggest]'); if(!b) return; $('#v-base').value=b.dataset.suggest; renderVLSM(); });
$('#v-table').addEventListener('click',e=>{ const tr=e.target.closest('tr[data-net]'); if(!tr) return; const r=parseCIDR(tr.dataset.net); setCalc(r.ip,r.p); go('calc'); });
$('#v-save').onclick=()=>{ const res=vResult; if(!res||res.error) return toast('Fix the address block first'); openSave('vlsm', `VLSM plan for ${ipStr(res.base.net)}/${res.p}`, vData()); };
$('#v-export').onclick=()=>{ const res=vResult; if(!res||res.error) return toast('Fix the address block first');
  openExport({title:`VLSM plan ${ipStr(res.base.net)}/${res.p}`, sections:[
    {heading:'Summary',kv:[['Address block',ipStr(res.base.net)+'/'+res.p],['Addresses used',`${fmt(res.used)} of ${fmt(res.base.size)}`],['Free blocks',res.free.map(f=>ipStr(f.net)+'/'+f.p).join(', ')||'None']]},
    {heading:'Allocations',table:{head:['Name','Hosts needed','Usable','Subnet','Mask','Host range','Broadcast','Spare'],rows:vlsmTable(res)}}]}); };
