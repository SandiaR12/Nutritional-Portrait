// features/recommendations.js
// Smart nutrition recommendation engine
// Base: INSP 2023, SMAE 5a Ed., INCMNSZ, Harvard Nutrition Source

import { state, remaining, MN } from '../core/state.js';
import { unify } from '../core/search.js';

// Meal-time weights (evidence-based nutrition timing)
const MEAL_W = {
  'Desayuno': {k:.8,p:.9,c:1.1,l:.8},
  'Col. AM':  {k:.5,p:.8,c:.7, l:.5},
  'Comida':   {k:1, p:1, c:1,  l:1 },
  'Col. PM':  {k:.5,p:.9,c:.6, l:.5},
  'Cena':     {k:.7,p:1.1,c:.6,l:.7},
};

function macScore(val, deficit, w) {
  if (deficit <= 0) return val > 2 ? -val*2 : 0;
  return Math.min(val/deficit, 1.0) * w * 100;
}

export function scoreFood(nf, rem, mealCtx, filter) {
  const w = MEAL_W[mealCtx] || {k:1,p:1,c:1,l:1};
  // Hard exclude if already met and food is heavy in that macro
  if (rem.pctK>=95 && nf.k>50)  return -10;
  if (rem.pctP>=95 && nf.p>5)   return -10;
  if (rem.pctC>=95 && nf.c>10)  return -10;
  if (rem.pctL>=95 && nf.l>5)   return -10;

  let score = 0;
  const F = {kcal:'k', prot:'p', carb:'c', fat:'l', smae:'all'}[filter] || 'all';

  if (F==='k') {
    score += macScore(nf.k, rem.k, w.k*2.5);
    if (nf.p>0) score += 10;
  } else if (F==='p') {
    const pDen = nf.k>0 ? nf.p/nf.k*100 : 0;
    score += macScore(nf.p, rem.p, w.p*3.0) + pDen*4 + (nf.p>15?20:0);
    if (nf._smae && nf.p>5) score += 15;
  } else if (F==='c') {
    score += macScore(nf.c, rem.c, w.c*2.8) + nf.fib*8;
    const fibR = nf.c>0 ? nf.fib/nf.c : 0;
    score += fibR*60;
    if (nf.l > nf.c*0.8) score -= 15;
  } else if (F==='l') {
    score += macScore(nf.l, rem.l, w.l*2.8);
    const fatR = nf.k>0 ? nf.l*9/nf.k : 0;
    if (fatR>0.4) score += 15;
    if (nf._smae && nf.l>3) score += 10;
  } else {
    if (filter==='smae' && !nf._smae) return -999;
    score += macScore(nf.k,rem.k,w.k*0.7) + macScore(nf.p,rem.p,w.p*1.3)
           + macScore(nf.c,rem.c,w.c*1.0) + macScore(nf.l,rem.l,w.l*0.9);
    const covers = [nf.k/rem.k,nf.p/rem.p,nf.c/rem.c,nf.l/rem.l].filter(v=>v>0.1).length;
    score += covers * 12;
    if (filter==='smae') score += 30;
  }
  if (nf._smae) score += 8;
  if (nf.g>=60 && nf.g<=400) score += 5;
  return Math.round(score);
}

export function qualityRating(nf, rem, mealCtx) {
  let issues=0, strengths=0;
  if (nf._smae) strengths++;
  if (rem.k>0 && nf.k>rem.k*1.15) issues++;
  if (rem.p>0 && nf.p>rem.p*1.6)  issues++;
  if (rem.c>0 && nf.c>rem.c*1.2)  issues++;
  if (rem.l>0 && nf.l>rem.l*1.3)  issues++;
  if (rem.pctK>=90 && nf.k>300)   issues++;
  if (rem.pctC>=90 && nf.c>40)    issues++;
  if (mealCtx==='Cena') { if(nf.c>80) issues++; if(nf.p>10) strengths++; if(nf.fib>3) strengths++; }
  if (mealCtx==='Desayuno') { if(nf.k<50) issues++; if(nf.fib>2) strengths++; }
  if (['Col. AM','Col. PM'].includes(mealCtx)) { if(nf.k>400) issues++; else if(nf.k>0) strengths++; }
  if (nf.fib>4) strengths++; if(nf.fib>8) strengths++;
  const pDen = nf.k>0 ? nf.p/nf.k*100 : 0;
  if (pDen>8) strengths++; if(pDen>15) strengths++;
  const net = strengths - issues;
  if (issues>=3) return 'rq-red';
  if (issues>=2) return 'rq-yellow';
  return net>=2 ? 'rq-green' : net>=0 ? 'rq-yellow' : 'rq-red';
}

export function getRecommendations(MEGA, SMAE, FOODS_EX) {
  const rem = remaining();
  if (!rem) return [];
  if (rem.pctK>=100 && rem.pctP>=100 && rem.pctC>=100 && rem.pctL>=100) return [];
  const mealCtx = state.curMeal || 'Comida';
  const filter  = window._recFilter || 'all';

  const pool = filter==='smae'
    ? SMAE.map((f,i)=>({nf:unify(f,'smae'),src:'smae',idx:i}))
    : [
        ...MEGA.map((f,i)=>({nf:unify(f,'mega'),src:'mega',idx:i})),
        ...SMAE.map((f,i)=>({nf:unify(f,'smae'),src:'smae',idx:i})),
        ...FOODS_EX.map((f,i)=>({nf:unify(f,'ex'),src:'ex',idx:i})),
      ];

  const scored = pool
    .map(e=>({...e, score:scoreFood(e.nf,rem,mealCtx,filter), quality:''}))
    .filter(e=>e.score>0)
    .map(e=>({...e, quality:qualityRating(e.nf,rem,mealCtx)}))
    .sort((a,b)=>{
      const Q={'rq-green':0,'rq-yellow':1,'rq-red':2};
      return (Q[a.quality]-Q[b.quality]) || (b.score-a.score);
    });

  const seenGrupo={}, results=[];
  let redCount=0;
  for (const e of scored) {
    if (results.length>=10) break;
    const grp=(e.nf.grupo||'').toLowerCase().split(' ')[0]||'gen';
    seenGrupo[grp]=(seenGrupo[grp]||0)+1;
    if (seenGrupo[grp]>2) continue;
    if (e.quality==='rq-red' && ++redCount>2) continue;
    results.push(e);
  }
  return results.slice(0,8);
}
