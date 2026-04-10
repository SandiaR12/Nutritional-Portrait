// core/state.js — Single mutable state object + typed accessors
// All modules read/write through this — no scattered globals

export const state = {
  pat: {}, prog: {}, logs: {},
  req: {k:2000, p:150, c:250, l:65},
  curDay:  null,
  curMeal: 'Desayuno',
  curMode: 'meal',
  charts:  {donut:null, bar:null},
};

export const MK = ['desayuno','colacion1','comida','colacion2','cena'];
export const MN = ['Desayuno','Col. AM','Comida','Col. PM','Cena'];
export const MI = ['☀️','🍎','🍽️','🍌','🌙'];

export function dayLog()  { return state.logs['day'+state.curDay] || []; }
export function dayProg() { return state.prog['day'+state.curDay] || {}; }
export function dayMeals(){ return state.pat.days?.['day'+state.curDay] || {}; }

export function consumed() {
  return dayLog().reduce((a,e)=>({k:a.k+e.k,p:a.p+e.p,c:a.c+e.c,l:a.l+e.l}),{k:0,p:0,c:0,l:0});
}
export function remaining() {
  const c = consumed(), r = state.req;
  return {
    k: Math.max(0, r.k - c.k), p: Math.max(0, r.p - c.p),
    c: Math.max(0, r.c - c.c), l: Math.max(0, r.l - c.l),
    pctK: r.k ? c.k/r.k*100 : 100, pctP: r.p ? c.p/r.p*100 : 100,
    pctC: r.c ? c.c/r.c*100 : 100, pctL: r.l ? c.l/r.l*100 : 100,
  };
}
