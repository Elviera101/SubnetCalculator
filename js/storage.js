/* Subnet Calculator · History (this browser) and saved calculations */

/* ================= storage: history + saved ================= */
let history = LS.get('sc.history', []);
const histTimers = {};
let booting = true;
function logHistory(kind,label,data){
  if(booting) return;
  clearTimeout(histTimers[kind]);
  histTimers[kind] = setTimeout(()=>{
    if(history[0] && history[0].kind===kind && history[0].label===label) return;
    history.unshift({id:uid(),kind,label,data,at:Date.now()});
    history = history.slice(0,40);
    LS.set('sc.history',history); renderHistory(); renderRecent();
  }, 1200);
}

const Saved = {
  items: LS.get('sc.saved', []).map(x=>({...x,local:true})),
  col: null,
  async init(){
    if(!window.claude || typeof window.claude.use!=='function') return;
    try{
      const [db,user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if(!db || !user) return;
      const id = await user.id(); if(!id) return;
      const col = db.collection('data/users/'+id);
      let migrated=false;
      col.onSnapshot(snap=>{
        this.col = col;
        const remote = snap.docs.filter(d=>d.exists).map(d=>({...d.data(), id:d.id}));
        const ids = new Set(remote.map(r=>r.id));
        const local = LS.get('sc.saved',[]).filter(l=>!ids.has(l.id));
        LS.set('sc.saved', local);
        this.items = [...remote, ...local.map(x=>({...x,local:true}))].sort((a,b)=>b.at-a.at);
        renderSaved();
        if(!migrated){ migrated=true; local.forEach(it=>{ const {local:_, id, ...rest}=it; col.doc(id).set(rest).catch(()=>{}); }); }
      }, ()=>{ this.col=null; renderSaved(); });
    }catch(e){ this.col=null; }
  },
  async add(kind,name,data){
    const item={kind,name,data,at:Date.now()}; const id=uid();
    if(this.col){
      try{ await this.col.doc(id).set(item); toast('Saved'); return; }
      catch(e){ /* fall through to local */ }
    }
    const local=LS.get('sc.saved',[]); local.unshift({...item,id}); LS.set('sc.saved',local);
    this.items.unshift({...item,id,local:true}); renderSaved(); toast('Saved in this browser');
  },
  async remove(it){
    if(!it.local && this.col){ try{ await this.col.doc(it.id).delete(); }catch(e){ toast('Could not delete. Try again.'); return; } }
    LS.set('sc.saved', LS.get('sc.saved',[]).filter(x=>x.id!==it.id));
    this.items = this.items.filter(x=>x.id!==it.id); renderSaved(); toast('Deleted');
  },
  async rename(it,name){
    if(!it.local && this.col){ try{ await this.col.doc(it.id).update({name}); }catch(e){ toast('Could not rename.'); return; } }
    else { LS.set('sc.saved', LS.get('sc.saved',[]).map(x=>x.id===it.id?{...x,name}:x)); }
    it.name=name; renderSaved();
  }
};
