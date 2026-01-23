const BUILD = "v3.8-clean";
console.log("Portal build:", BUILD);

const params = new URLSearchParams(window.location.search);
const planId = params.get("id") || "";

/** Plan local (placeholder). Cuando metas Firebase, aquí se sobreescribe. */
let PLAN = Array.from({length:15}).map((_,i)=>({
  day:i+1,
  desayuno:"—",
  col1:"—",
  comida:"—",
  col2:"—",
  cena:"—"
}));

let selectedDay = 1;

function storageKey(){
  return `np_v38_${planId || "sinid"}`;
}

function getState(){
  try{
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : { meals:{}, concluded:{} };
  }catch(e){
    return { meals:{}, concluded:{} };
  }
}

function setState(s){
  localStorage.setItem(storageKey(), JSON.stringify(s));
}

function ensureDay(s, day){
  const d = String(day);
  if(!s.meals[d]) s.meals[d] = {desayuno:false, col1:false, comida:false, col2:false, cena:false};
  if(s.concluded[d] === undefined) s.concluded[d] = false;
  return s;
}

function computeProgress(s, day){
  const d = String(day);
  const m = s.meals[d];
  const total = 5;
  const done = Object.values(m).filter(Boolean).length;
  return {done,total,pct: Math.round((done/total)*100)};
}

function ringSvg(pct, label){
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (pct/100) * c;
  const isFull = pct >= 100;

  return `
  <svg class="ringSvg" viewBox="0 0 64 64" aria-label="Día ${label}">
    <defs>
      <linearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(59,130,246,.95)"/>
        <stop offset="35%" stop-color="rgba(168,85,247,.95)"/>
        <stop offset="70%" stop-color="rgba(34,197,94,.95)"/>
        <stop offset="100%" stop-color="rgba(236,72,153,.95)"/>
      </linearGradient>
    </defs>

    <circle class="ringBase" cx="32" cy="32" r="${r}" stroke-width="8" fill="none"/>
    <circle class="ringProg ${isFull ? "prismatic" : ""}" cx="32" cy="32" r="${r}" stroke-width="8" fill="none"
      stroke-linecap="round"
      stroke-dasharray="${c}"
      stroke-dashoffset="${offset}"
      transform="rotate(-90 32 32)"/>
    <text class="ringText" x="32" y="36" text-anchor="middle" font-size="14">${label}</text>
  </svg>`;
}

function renderDays(s){
  const wrap = document.getElementById("days");
  wrap.innerHTML = "";
  for(let i=1;i<=15;i++){
    const prog = computeProgress(s, i);
    const el = document.createElement("div");
    el.className = "ringDay";
    el.innerHTML = ringSvg(prog.pct, String(i)) + `<div class="ringNum">Día ${i}</div>`;
    el.addEventListener("click", ()=>{
      selectDay(i);
      scrollTo("plan");
    });
    wrap.appendChild(el);
  }
}

function scrollTo(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
}

function setMealCircle(id, done){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.toggle("done", !!done);
}

function renderDay(s){
  const d = PLAN[selectedDay-1] || PLAN[0];

  document.getElementById("dayTitle").textContent = `Día ${selectedDay}`;
  document.getElementById("daySub").textContent = "—";

  document.getElementById("t_desayuno").textContent = d.desayuno || "—";
  document.getElementById("t_col1").textContent = d.col1 || "—";
  document.getElementById("t_comida").textContent = d.comida || "—";
  document.getElementById("t_col2").textContent = d.col2 || "—";
  document.getElementById("t_cena").textContent = d.cena || "—";

  const prog = computeProgress(s, selectedDay);
  document.getElementById("progressFill").style.width = `${prog.pct}%`;
  document.getElementById("progressText").textContent = `${prog.done} / ${prog.total} completado`;
  document.getElementById("kProg").textContent = `${prog.pct}%`;

  const ds = s.meals[String(selectedDay)];
  setMealCircle("c_desayuno", ds.desayuno);
  setMealCircle("c_col1", ds.col1);
  setMealCircle("c_comida", ds.comida);
  setMealCircle("c_col2", ds.col2);
  setMealCircle("c_cena", ds.cena);
}

function selectDay(day){
  selectedDay = day;
  const s = ensureDay(getState(), day);
  setState(s);
  renderDay(s);
  renderDays(s);
}

function toggleMeal(mealKey, circleId){
  const s = ensureDay(getState(), selectedDay);
  const d = String(selectedDay);
  s.meals[d][mealKey] = !s.meals[d][mealKey];
  setState(s);
  renderDay(s);
  renderDays(s);
}

function resetDay(){
  const s = ensureDay(getState(), selectedDay);
  const d = String(selectedDay);
  s.meals[d] = {desayuno:false, col1:false, comida:false, col2:false, cena:false};
  setState(s);
  renderDay(s);
  renderDays(s);
}

function concludeDay(){
  const s = ensureDay(getState(), selectedDay);
  s.concluded[String(selectedDay)] = true;
  setState(s);
  renderDays(s);
}

function init(){
  // Patient placeholder
  document.getElementById("pillClient").textContent = "Paciente: —";
  document.getElementById("patientName").textContent = "Paciente";

  // Buttons
  document.getElementById("btnVerDieta").addEventListener("click", ()=>scrollTo("plan"));
  document.getElementById("btnCalendario").addEventListener("click", ()=>scrollTo("dias"));
  document.getElementById("btnReset").addEventListener("click", resetDay);
  document.getElementById("btnConcluir").addEventListener("click", concludeDay);

  // Meal circles
  document.getElementById("c_desayuno").addEventListener("click", ()=>toggleMeal("desayuno","c_desayuno"));
  document.getElementById("c_col1").addEventListener("click", ()=>toggleMeal("col1","c_col1"));
  document.getElementById("c_comida").addEventListener("click", ()=>toggleMeal("comida","c_comida"));
  document.getElementById("c_col2").addEventListener("click", ()=>toggleMeal("col2","c_col2"));
  document.getElementById("c_cena").addEventListener("click", ()=>toggleMeal("cena","c_cena"));

  const s = ensureDay(getState(), 1);
  setState(s);
  renderDays(s);
  selectDay(1);
}

init();
