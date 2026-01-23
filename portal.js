import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCcA1fbapUdDbgrgn5sl9vBxX_XfKQmys",
  authDomain: "portalnutricionals.firebaseapp.com",
  projectId: "portalnutricionals",
  storageBucket: "portalnutricionals.firebasestorage.app",
  messagingSenderId: "1085909222208",
  appId: "1:1085909222208:web:6650c8cf248fc5754fb0a5",
  measurementId: "G-CMP8WBR4LE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const planId = params.get("id") || "";

let PLAN = Array.from({length:15}).map((_,i)=>({
  day:i+1,
  label:`Día ${i+1}`,
  hint: i<7?"Semana 1":i<14?"Semana 2":"Semana 3",
  desayuno:"—", comida:"—", cena:"—", col1:"—", col2:"—"
}));

let selectedDay = 1;

function storageKey(){
  return `np_v35_${planId || "sinid"}`;
}

function getProgressState(){
  try{
    const raw = localStorage.getItem(storageKey());
    return raw ? JSON.parse(raw) : { meals:{}, concluded:{} };
  }catch(e){
    return { meals:{}, concluded:{} };
  }
}

function setProgressState(state){
  localStorage.setItem(storageKey(), JSON.stringify(state));
}

function ensureDayState(state, day){
  const d = String(day);
  if(!state.meals[d]) state.meals[d] = {desayuno:false, comida:false, cena:false, col1:false, col2:false};
  if(state.concluded[d] === undefined) state.concluded[d] = false;
  return state;
}

function computeDayProgress(state, day){
  const d = String(day);
  const m = state.meals[d];
  const total = 5;
  const done = Object.values(m).filter(Boolean).length;
  return {done, total, pct: Math.round((done/total)*100)};
}

function ringSvg(pct, label){
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (pct/100) * c;
  return `
  <svg class="ringSvg" viewBox="0 0 64 64" aria-label="${label}">
    <circle class="ringBase" cx="32" cy="32" r="${r}" stroke-width="8" fill="none"/>
    <circle class="ringProg" cx="32" cy="32" r="${r}" stroke-width="8" fill="none"
      stroke-linecap="round"
      stroke-dasharray="${c}"
      stroke-dashoffset="${offset}"
      transform="rotate(-90 32 32)"/>
    <text class="ringText" x="32" y="36" text-anchor="middle" font-size="14">${label}</text>
  </svg>`;
}

function renderDays(state){
  const wrap = document.getElementById("days");
  wrap.innerHTML = "";
  PLAN.forEach(d=>{
    const prog = computeDayProgress(state, d.day);
    const el = document.createElement("div");
    el.className = "ringDay";
    el.innerHTML = ringSvg(prog.pct, String(d.day)) + `<div class="ringNum">${d.hint}</div>`;
    el.onclick = ()=>{
      selectDay(d.day);
      scrollToId("plan");
    };
    wrap.appendChild(el);
  });
}

function setMealCircle(meal, isDone){
  const c = document.getElementById(`c_${meal}`);
  if(!c) return;
  c.classList.toggle("done", !!isDone);
}

function renderProgress(state){
  const p = computeDayProgress(state, selectedDay);
  document.getElementById("progressFill").style.width = `${p.pct}%`;
  document.getElementById("progressText").textContent = `${p.done} / ${p.total} completado`;
  document.getElementById("kProg").textContent = `${p.pct}%`;
}

function renderMealCircles(state){
  const d = String(selectedDay);
  const m = state.meals[d];
  ["desayuno","col1","comida","col2","cena"].forEach(k=>setMealCircle(k, m[k]));
}

function selectDay(day){
  selectedDay = day;
  const d = PLAN[day-1];

  document.getElementById("dayTitle").textContent = d.label;
  document.getElementById("daySub").textContent = d.hint;

  document.getElementById("m1").textContent = d.desayuno || "—";
  document.getElementById("s1").textContent = d.col1 || "—";
  document.getElementById("m2").textContent = d.comida || "—";
  document.getElementById("s2").textContent = d.col2 || "—";
  document.getElementById("m3").textContent = d.cena || "—";

  const state = ensureDayState(getProgressState(), day);
  setProgressState(state);

  renderMealCircles(state);
  renderProgress(state);
  renderDays(state);
}

window.scrollToId = (id)=>{
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
};

window.toggleMeal = (meal)=>{
  const state = ensureDayState(getProgressState(), selectedDay);
  const d = String(selectedDay);
  state.meals[d][meal] = !state.meals[d][meal];
  setProgressState(state);
  renderMealCircles(state);
  renderProgress(state);
  renderDays(state);
};

window.resetDayProgress = ()=>{
  const state = ensureDayState(getProgressState(), selectedDay);
  const d = String(selectedDay);
  state.meals[d] = {desayuno:false, comida:false, cena:false, col1:false, col2:false};
  setProgressState(state);
  renderMealCircles(state);
  renderProgress(state);
  renderDays(state);
};

window.concludeDay = ()=>{
  const state = ensureDayState(getProgressState(), selectedDay);
  const d = String(selectedDay);
  state.concluded[d] = true;
  setProgressState(state);
  renderDays(state);
};

async function loadPlan(){
  if(!planId){
    document.getElementById("chipStatus").textContent = "Portal listo";
    document.getElementById("kCalorias").textContent = "—";
    document.getElementById("kProte").textContent = "—";
    document.getElementById("pillClient").textContent = "Paciente: —";
    document.getElementById("patientName").textContent = "Paciente";
    const state = ensureDayState(getProgressState(), 1);
    setProgressState(state);
    renderDays(state);
    selectDay(1);
    return;
  }

  try{
    const ref = doc(db, "plans", planId);
    const snap = await getDoc(ref);

    if(!snap.exists()){
      document.getElementById("chipStatus").textContent = "Plan no disponible";
      document.getElementById("patientName").textContent = "Paciente";
      const state = ensureDayState(getProgressState(), 1);
      setProgressState(state);
      renderDays(state);
      selectDay(1);
      return;
    }

    const data = snap.data();
    const paciente = data.paciente || "Paciente";
    document.getElementById("pillClient").textContent = `Paciente: ${paciente}`;
    document.getElementById("patientName").textContent = paciente;

    document.getElementById("kCalorias").textContent = data.calorias ? `${data.calorias} kcal` : "—";
    document.getElementById("kProte").textContent = data.metaProteina ? `${data.metaProteina} g` : "—";

    if(Array.isArray(data.plan) && data.plan.length){
      PLAN = data.plan.map((x,i)=>({
        day: x.day ?? (i+1),
        label: x.label ?? `Día ${i+1}`,
        hint: x.hint ?? (i<7?"Semana 1":i<14?"Semana 2":"Semana 3"),
        desayuno: x.desayuno ?? "—",
        comida: x.comida ?? "—",
        cena: x.cena ?? "—",
        col1: x.col1 ?? "—",
        col2: x.col2 ?? "—",
      }));
    }

    document.getElementById("chipStatus").textContent = "Plan activo";

    const state = ensureDayState(getProgressState(), 1);
    setProgressState(state);
    renderDays(state);
    selectDay(1);

  }catch(err){
    console.error(err);
    document.getElementById("chipStatus").textContent = "Portal listo";
    document.getElementById("patientName").textContent = "Paciente";
    const state = ensureDayState(getProgressState(), 1);
    setProgressState(state);
    renderDays(state);
    selectDay(1);
  }
}

loadPlan();
