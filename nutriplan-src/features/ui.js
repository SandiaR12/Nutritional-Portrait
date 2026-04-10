// features/ui.js — DOM render functions (pure: given state → DOM)
// Each render function is idempotent and self-contained

import { state, MK, MN, MI, dayProg, dayMeals, dayLog, remaining, consumed } from '../core/state.js';

const $ = id => document.getElementById(id);

// ── Calendar ─────────────────────────────────────────────────────────
export function renderCal() {
  const g = $('calGrid'); if (!g) return;
  // Reuse existing cells to avoid full DOM recreation
  const cells = g.children;
  for (let d=1; d<=15; d++) {
    const pd   = state.prog['day'+d] || {};
    const c    = Object.values(pd).filter(Boolean).length;
    const hl   = (state.logs['day'+d]||[]).length > 0;
    const isOpen = d === state.curDay;
    let el = cells[d-1];
    if (!el) {
      el = document.createElement('div');
      el.style.animationDelay = (d*.03)+'s';
      el.onclick = ()=>window.openSheet(d);
      g.appendChild(el);
    }
    const cls = 'cc'+(c===5?' done':'')+(hl?' has-log':'')+(isOpen?' sel':'');
    if (el.className !== cls) el.className = cls;
    el.innerHTML =
      '<div class="cc-dots">'+[0,1,2,3,4].map(i=>'<div class="cc-dot'+(i<c?' on':'')+'"></div>').join('')+'</div>'+
      '<div class="cc-num">'+d+'</div><div class="cc-sub">Día</div>';
  }
}

// ── Hero ─────────────────────────────────────────────────────────────
export function renderHero() {
  const p = state.pat, r = state.req;
  $('hAv').textContent  = (p.name||'?')[0].toUpperCase();
  $('hName').textContent = p.name||'Paciente';
  $('hMeta').textContent = [p.age&&p.age+' años',p.weight&&p.weight+' kg'].filter(Boolean).join(' · ');
  if (p.goal) { $('hGoal').style.display='inline-flex'; $('hGoalTxt').textContent=p.goal; }
  $('rK').textContent = r.k; $('rP').textContent=r.p+'g';
  $('rC').textContent = r.c+'g'; $('rL').textContent=r.l+'g';
  $('navChip').textContent = '15 días';
  const maxes = {k:3500,p:250,c:400,l:120};
  ['k','p','c','l'].forEach(m=>{
    const el=$('r'+m.toUpperCase()+'bar');
    if(el) el.style.width = Math.min(r[m]/maxes[m]*100,100)+'%';
  });
  renderStats();
}

export function renderStats() {
  const days  = Object.values(state.prog).filter(d=>Object.values(d||{}).filter(Boolean).length===5).length;
  const meals = Object.values(state.prog).reduce((s,d)=>s+Object.values(d||{}).filter(Boolean).length,0);
  const logD  = Object.keys(state.logs).filter(k=>(state.logs[k]||[]).length>0).length;
  $('sDays').textContent  = days+'/15';
  $('sMeals').textContent = meals+'/75';
  $('sLog').textContent   = logD;
  const pct = Math.round(meals/75*100);
  $('rPct').textContent = pct+'%';
  $('rFill').style.strokeDashoffset = 201.1-(pct/100*201.1);
}

// ── Meal list ─────────────────────────────────────────────────────────
export function renderMeals() {
  const list=$('mealList'), pd=dayProg(), dm=dayMeals();
  list.innerHTML='';
  MK.forEach((k,i)=>{
    const done=pd[k]?true:false;
    const el=document.createElement('div');
    el.className='meal-item'+(done?' done':'');
    el.style.animation='spIn .25s '+(i*.07)+'s both';
    el.innerHTML=
      '<div class="meal-cb">'+(done?'✓':'')+'</div>'+
      '<div class="meal-body">'+
        '<div class="meal-hdr"><span class="meal-ico">'+MI[i]+'</span><span class="meal-nm">'+MN[i]+'</span></div>'+
        '<div class="meal-desc">'+(dm[k]||'Sin especificar')+'</div>'+
      '</div>';
    el.onclick=()=>window.toggleMeal(k);
    list.appendChild(el);
  });
}

// ── Sheet progress ────────────────────────────────────────────────────
export function renderSheetProg() {
  if (!state.curDay) return;
  const c = Object.values(dayProg()).filter(Boolean).length;
  $('shFill').style.width = (c/5*100)+'%';
  $('shLbl').textContent  = c+'/5';
  $('shTtl').textContent  = 'Día '+state.curDay;
}

// ── Log ────────────────────────────────────────────────────────────────
export function renderLog() {
  const log=dayLog(), w=$('logList');
  if (!log.length){ w.innerHTML='<div class="log-empty">Sin alimentos registrados.</div>'; return; }
  let h='';
  for (const mn of MN){
    const es=log.filter(e=>e.meal===mn); if(!es.length) continue;
    h+='<div class="log-sec"><div class="log-sec-h">'+mn+'</div>';
    for (const e of es){
      h+='<div class="log-ent">'+
        '<div class="log-food"><span class="log-fn">'+e.nombre+'</span>'+
        '<span class="log-fs">'+(e.grupo||'')+' · '+e.qd+'</span></div>'+
        '<span class="log-k">🔥'+e.k+'</span>'+
        '<span class="log-m" style="color:#059669">💪'+e.p+'g</span>'+
        '<span class="log-m" style="color:#2563eb">🌾'+e.c+'g</span>'+
        '<span class="log-m" style="color:#dc2626">🥑'+e.l+'g</span>'+
        '<button class="log-del" onclick="window.delEntry('+e.id+')">✕</button>'+
      '</div>';
    }
    h+='</div>';
  }
  w.innerHTML=h;
}

// ── Analysis ───────────────────────────────────────────────────────────
export function renderAnalysis() {
  const log=dayLog(), rem=remaining();
  const t=consumed();
  const pK=state.req.k?t.k/state.req.k*100:0, pP=state.req.p?t.p/state.req.p*100:0;
  const pC=state.req.c?t.c/state.req.c*100:0, pL=state.req.l?t.l/state.req.l*100:0;
  $('amK').textContent=Math.round(t.k); $('amP').textContent=t.p.toFixed(1)+'g';
  $('amC').textContent=t.c.toFixed(1)+'g'; $('amF').textContent=t.l.toFixed(1)+'g';
  $('amKp').textContent=Math.round(pK)+'%'; $('amPp').textContent=Math.round(pP)+'%';
  $('amCp').textContent=Math.round(pC)+'%'; $('amFp').textContent=Math.round(pL)+'%';
  const bc=p=>p>110?'af-hi':p>85?'af-ok':'af-low';
  const sm=(p,l)=>!p?'':p>115?'🔴 Excediste '+l+' ('+Math.round(p)+'%)':p>=85?'✅ '+l+' en rango':'🟡 Falta '+l+' ('+Math.round(p)+'%)';
  [['bK',pK,t.k,state.req.k,'kcal','Calorías'],['bP',pP,t.p,state.req.p,'g','Proteínas'],
   ['bC',pC,t.c,state.req.c,'g','Carbohidratos'],['bL',pL,t.l,state.req.l,'g','Grasas']].forEach(([id,pct,val,r,u,lbl])=>{
    $(id).style.width=Math.min(pct,100)+'%'; $(id).className='anfill '+bc(pct);
    $(id+'l').textContent=(u==='kcal'?Math.round(val):val.toFixed(1))+' / '+r+' '+u;
    const s=$(id+'s'); if(s){s.textContent=sm(pct,lbl);s.className='anbar-st '+(pct>110?'as-hi':pct>=85?'as-ok':'as-low');}
  });
  const sts=$('anSt');
  if(!log.length)         sts.innerHTML='<span>ℹ️</span> Agrega alimentos para ver tu análisis.';
  else if(pK>=85&&pP>=85&&pC>=85&&pL>=85) sts.innerHTML='<span>✅</span> ¡Cumpliste todos tus requerimientos!';
  else if(pK>115||pP>115||pC>115||pL>115) sts.innerHTML='<span>⚠️</span> Superaste algún requerimiento.';
  else                    sts.innerHTML='<span>📊</span> Sigue registrando para alcanzar tus metas.';
  sts.className='food-st '+(log.length===0?'fst-idle':pK>=85&&pP>=85&&pC>=85&&pL>=85?'fst-ok':pK>115||pP>115||pC>115||pL>115?'fst-over':'fst-warn');
  // Charts — update data without destroy/recreate (performance fix)
  const mK=MN.map(m=>log.filter(e=>e.meal===m).reduce((s,e)=>s+e.k,0));
  if (state.charts.donut) {
    state.charts.donut.data.datasets[0].data=[t.p*4||0,t.c*4||0,t.l*9||0];
    state.charts.donut.update('none');
  }
  if (state.charts.bar) {
    state.charts.bar.data.datasets[0].data=mK;
    state.charts.bar.update('none');
  }
}
