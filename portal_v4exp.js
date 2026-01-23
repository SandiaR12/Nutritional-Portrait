const BUILD = "V.4exp";
console.log("Portal build:", BUILD);

const params = new URLSearchParams(window.location.search);
const planId = params.get("id") || "demo";

const MEALS = ["desayuno","col1","comida","col2","cena"];

const PLAN = Array.from({length:15}).map((_,i)=>({
  day:i+1,
  desayuno:"—",
  col1:"—",
  comida:"—",
  col2:"—",
  cena:"—"
}));

let selectedDay = 1;

function key(){
  return `np_v4exp_${planId}`;
}

function loadState(){
  try{
    const raw = localStorage.getItem(key());
    return raw ? JSON.parse(raw) : { meals:{} };
  }catch(e){
    return { meals:{} };
  }
}
function saveState(s){
  localStorage.setItem(key(), JSON.stringify(s));
}

function ensureDay(s, day){
  const d = String(day);
  if(!s.meals[d]){
    s.meals[d] = {desayuno:false,col1:false,comida:false,col2:false,cena:false};
  }
  return s;
}

function dayProgress(s, day){
  const d = String(day);
  const m = s.meals[d];
  const done = MEALS.filter(k=>m[k]).length;
  const total = MEALS.length;
  const pct = Math.round((done/total)*100);
  return {done,total,pct};
}

function ringSvg(pct, label){
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct/100) * c;
  const full = pct >= 100;

  return `
  <svg class="ringSvg" viewBox="0 0 72 72" aria-label="Día ${label}">
    <defs>
      <linearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(59,130,246,.98)"/>
        <stop offset="35%" stop-color="rgba(168,85,247,.98)"/>
        <stop offset="70%" stop-color="rgba(34,197,94,.98)"/>
        <stop offset="100%" stop-color="rgba(236,72,153,.98)"/>
      </linearGradient>
    </defs>

    <circle class="ringBase" cx="36" cy="36" r="${r}" stroke-width="8" fill="none"/>
    <circle class="ringProg ${full ? "prismatic" : ""}" cx="36" cy="36" r="${r}" stroke-width="8" fill="none"
      stroke-linecap="round"
      stroke-dasharray="${c}"
      stroke-dashoffset="${offset}"
      transform="rotate(-90 36 36)"/>
    <text class="ringText" x="36" y="41" text-anchor="middle" font-size="14">${label}</text>
  </svg>`;
}

function renderRings(s){
  const grid = document.getElementById("ringsGrid");
  grid.innerHTML = "";

  for(let i=1;i<=15;i++){
    const prog = dayProgress(s, i);
    const item = document.createElement("div");
    item.className = "ringItem";
    item.innerHTML = ringSvg(prog.pct, String(i)) + `<div class="ringLabel">Día ${i}</div>`;
    item.addEventListener("click", ()=>{
      selectDay(i);
      document.getElementById("plan").scrollIntoView({behavior:"smooth", block:"start"});
    });
    grid.appendChild(item);
  }
}

function setDot(meal, done){
  const el = document.getElementById(`dot_${meal}`);
  if(!el) return;
  el.classList.toggle("done", !!done);
}

function renderDay(s){
  const d = PLAN[selectedDay-1];

  document.getElementById("dayTitle").textContent = `Día ${selectedDay}`;

  document.getElementById("txt_desayuno").textContent = d.desayuno;
  document.getElementById("txt_col1").textContent = d.col1;
  document.getElementById("txt_comida").textContent = d.comida;
  document.getElementById("txt_col2").textContent = d.col2;
  document.getElementById("txt_cena").textContent = d.cena;

  const prog = dayProgress(s, selectedDay);
  document.getElementById("barFill").style.width = `${prog.pct}%`;
  document.getElementById("barText").textContent = `${prog.done} / ${prog.total} completado`;
  document.getElementById("progDay").textContent = `${prog.pct}%`;
  document.getElementById("miniPct").textContent = `${prog.pct}%`;

  const m = s.meals[String(selectedDay)];
  MEALS.forEach(k=>setDot(k, m[k]));
}

function selectDay(day){
  selectedDay = day;
  const s = ensureDay(loadState(), day);
  saveState(s);
  renderDay(s);
  renderRings(s);
}

function toggleMeal(meal){
  const s = ensureDay(loadState(), selectedDay);
  const d = String(selectedDay);
  s.meals[d][meal] = !s.meals[d][meal];
  saveState(s);
  renderDay(s);
  renderRings(s);
}

function resetDay(){
  const s = ensureDay(loadState(), selectedDay);
  const d = String(selectedDay);
  s.meals[d] = {desayuno:false,col1:false,comida:false,col2:false,cena:false};
  saveState(s);
  renderDay(s);
  renderRings(s);
}

function resetAll(){
  localStorage.removeItem(key());
  const s = ensureDay(loadState(), 1);
  saveState(s);
  selectDay(1);
}

function init(){
  document.getElementById("pillId").textContent = `ID: ${planId}`;
  document.getElementById("pillPaciente").textContent = "Paciente: —";
  document.getElementById("patientName").textContent = "Paciente";

  // placeholders (editable later via admin/firebase)
  document.getElementById("kcal").textContent = "—";
  document.getElementById("prot").textContent = "—";

  document.getElementById("btnResetAll").addEventListener("click", resetAll);
  document.getElementById("btnResetDay").addEventListener("click", resetDay);
  document.getElementById("btnToTop").addEventListener("click", ()=>{
    window.scrollTo({top:0, behavior:"smooth"});
  });

  MEALS.forEach(m=>{
    document.getElementById(`dot_${m}`).addEventListener("click", ()=>toggleMeal(m));
  });

  const s = ensureDay(loadState(), 1);
  saveState(s);
  renderRings(s);
  selectDay(1);
}

init();
