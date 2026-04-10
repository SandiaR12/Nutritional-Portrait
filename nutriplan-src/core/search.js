// core/search.js — Unified fuzzy search over all food databases
// Single normalize + single score function (replaces 3 duplicates)

const _cache = new Map();      // normalisation cache
const _recs  = new Map();      // scored results cache keyed by deficits

export function normalize(s) {
  if (_cache.has(s)) return _cache.get(s);
  const v = (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  _cache.set(s, v);
  return v;
}

export function score(food, nq) {
  const fn  = normalize(food.nombre || food.n || '');
  const als = (food.alias||[]).map(normalize);
  const st  = nq.endsWith('s') && nq.length>4 ? nq.slice(0,-1) : nq;
  if (fn===nq || fn===st)        return 100;
  if (fn.startsWith(nq))         return 92;
  if (als.some(a=>a===nq||a===st))    return 88;
  if (als.some(a=>a.startsWith(nq))) return 80;
  if (fn.includes(nq)||fn.includes(st))    return 68;
  if (als.some(a=>a.includes(nq)||a.includes(st))) return 58;
  const ws = nq.split(/\s+/).filter(w=>w.length>2);
  if (ws.length > 1) {
    const expanded = [...new Set([...ws, ...ws.map(w=>w.endsWith('s')&&w.length>4?w.slice(0,-1):w)])];
    const hits = expanded.filter(w=>fn.includes(w)||als.some(a=>a.includes(w)));
    if (hits.length) return Math.round(hits.length/Math.max(ws.length,1)*42);
  }
  return 0;
}

// Search across pool — returns top N sorted by score
export function search(pool, query, limit=40) {
  const nq = normalize(query.trim());
  if (nq.length < 1) return [];
  return pool
    .map((f,i)=>({f,i,s:score(f,nq)}))
    .filter(x=>x.s>0)
    .sort((a,b)=>b.s-a.s)
    .slice(0,limit);
}

// Normalise any food to unified shape for recommendation engine
export function unify(f, src) {
  if (src==='mega') return {
    nombre:f.nombre, grupo:f.grupo||'',
    k:+f.kcal,   p:+f.proteina_g,   c:+f.carbohidratos_g, l:+f.lipidos_g,
    fib:+(f.fibra_g||0), g:+(f.porcion_g||f.peso_neto_g||100),
    _src:'mega', _smae:false,
  };
  if (src==='smae') return {
    nombre:f.nombre, grupo:f.grupo||'',
    k:+f.kcal,   p:+f.proteina_g,   c:+f.carbohidratos_g, l:+f.lipidos_g,
    fib:+(f.fibra_g||0), g:+(f.peso_neto_g||100),
    unidad:f.unidad||'porción', cant:+(f.cantidad_porcion||1),
    _src:'smae', _smae:true,
  };
  return { nombre:f.n, grupo:f.src||'', k:+f.k, p:+f.p, c:+f.c, l:+f.l, fib:0, g:+f.g, _src:'ex', _smae:false };
}
