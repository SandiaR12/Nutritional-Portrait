import { db } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const MEALS = ['desayuno','col1','comida','col2','cena'];

const $ = (q)=>document.querySelector(q);

const els = {
  pid: $('#pid'),
  pname: $('#pname'),
  pperiodo: $('#pperiodo'),
  pcal: $('#pcal'),
  ppro: $('#ppro'),
  pcarb: $('#pcarb'),
  pfat: $('#pfat'),
  savePatient: $('#savePatient'),
  openPatient: $('#openPatient'),
  copyLink: $('#copyLink'),
  status: $('#status'),

  prevDay: $('#prevDay'),
  nextDay: $('#nextDay'),
  dayLabel: $('#dayLabel'),

  desayuno: $('#desayuno'),
  col1: $('#col1'),
  comida: $('#comida'),
  col2: $('#col2'),
  cena: $('#cena'),

  saveDay: $('#saveDay'),
  resetProgressDay: $('#resetProgressDay'),
  progressGrid: $('#progressGrid'),
};

let currentDay = 1;
let currentId = null;
let unsub = null;
let cachedPatient = null;

const patientRef = (id)=>doc(db, "patients", id);

function ensureShape(p){
  if(!p.meta) p.meta = {cal:"—", pro:"—", carb:"—", fat:"—"};
  if(!p.plan) p.plan = {};
  if(!p.progress) p.progress = {};
  for(let d=1; d<=15; d++){
    const k = String(d);
    if(!p.plan[k]) p.plan[k] = {desayuno:"—", col1:"—", comida:"—", col2:"—", cena:"—"};
    if(!p.progress[k]) p.progress[k] = {desayuno:false,col1:false,comida:false,col2:false,cena:false, concluded:false};
  }
  return p;
}

function setStatus(msg){ els.status.textContent = msg; }
function setDayUI(){ els.dayLabel.textContent = `Día ${currentDay}`; }

function loadDayToForm(p){
  const plan = (p.plan && p.plan[String(currentDay)]) || {};
  els.desayuno.value = plan.desayuno ?? '';
  els.col1.value = plan.col1 ?? '';
  els.comida.value = plan.comida ?? '';
  els.col2.value = plan.col2 ?? '';
  els.cena.value = plan.cena ?? '';
}

function renderProgress(p){
  els.progressGrid.innerHTML = '';
  for(let d=1; d<=15; d++){
    const k = String(d);
    const pr = p.progress[k];
    const done = MEALS.reduce((a,m)=>a+(pr[m]?1:0),0);
    const concluded = !!pr.concluded;
    const box = document.createElement('div');
    box.className = 'pg';
    box.innerHTML = `
      <div class="d">Día ${d}</div>
      <div class="s">${done}/5 · ${concluded ? 'Concluido' : 'No concluido'}</div>
    `;
    els.progressGrid.appendChild(box);
  }
}

async function openPatient(){
  const id = els.pid.value.trim();
  if(!id) return setStatus("Pon un ID (ej: juan15).");
  currentId = id;

  const snap = await getDoc(patientRef(id));
  let data;
  if(!snap.exists()){
    data = ensureShape({
      name: els.pname.value.trim() || id,
      periodo: els.pperiodo.value.trim() || '—',
      meta: {
        cal: els.pcal.value.trim() || '—',
        pro: els.ppro.value.trim() || '—',
        carb: els.pcarb.value.trim() || '—',
        fat: els.pfat.value.trim() || '—',
      }
    });
    await setDoc(patientRef(id), data);
    setStatus("Paciente creado en Firebase.");
  }else{
    data = ensureShape(snap.data());
    setStatus("Paciente cargado.");
  }

  cachedPatient = data;

  // fill top fields
  els.pname.value = data.name || '';
  els.pperiodo.value = data.periodo || '';
  els.pcal.value = data.meta.cal ?? '';
  els.ppro.value = data.meta.pro ?? '';
  els.pcarb.value = data.meta.carb ?? '';
  els.pfat.value = data.meta.fat ?? '';

  setDayUI();
  loadDayToForm(data);
  renderProgress(data);

  // live updates (progress)
  if(unsub) unsub();
  unsub = onSnapshot(patientRef(id), (docSnap)=>{
    if(docSnap.exists()){
      const live = ensureShape(docSnap.data());
      cachedPatient = live;
      renderProgress(live);
      // if admin is currently editing day, keep form synced to that day
      loadDayToForm(live);
    }
  });
}

async function savePatient(){
  const id = els.pid.value.trim();
  if(!id) return setStatus("Pon un ID.");
  const payload = {
    name: els.pname.value.trim() || id,
    periodo: els.pperiodo.value.trim() || '—',
    meta: {
      cal: els.pcal.value.trim() || '—',
      pro: els.ppro.value.trim() || '—',
      carb: els.pcarb.value.trim() || '—',
      fat: els.pfat.value.trim() || '—',
    }
  };
  await updateDoc(patientRef(id), payload);
  setStatus("Datos guardados.");
}

async function saveDay(){
  const id = els.pid.value.trim();
  if(!id) return setStatus("Pon un ID.");
  const dayKey = String(currentDay);

  const dayPlan = {
    desayuno: els.desayuno.value.trim() || '—',
    col1: els.col1.value.trim() || '—',
    comida: els.comida.value.trim() || '—',
    col2: els.col2.value.trim() || '—',
    cena: els.cena.value.trim() || '—',
  };

  // IMPORTANT: only update THIS day
  await updateDoc(patientRef(id), {
    [`plan.${dayKey}`]: dayPlan
  });

  setStatus(`Plan del Día ${currentDay} guardado.`);
}

async function resetProgressDay(){
  const id = els.pid.value.trim();
  if(!id) return setStatus("Pon un ID.");
  const dayKey = String(currentDay);
  await updateDoc(patientRef(id), {
    [`progress.${dayKey}`]: {desayuno:false,col1:false,comida:false,col2:false,cena:false, concluded:false}
  });
  setStatus(`Progreso del Día ${currentDay} reiniciado.`);
}

function copyLink(){
  const id = els.pid.value.trim();
  if(!id) return setStatus("Pon un ID.");
  const url = `${location.origin}${location.pathname.replace('admin.html','clean.html')}?id=${encodeURIComponent(id)}`;
  navigator.clipboard.writeText(url);
  setStatus("Link copiado. Pégalo en WhatsApp.");
}

async function goDay(delta){
  if(!currentId){
    setStatus("Primero abre un paciente.");
    return;
  }
  currentDay = Math.min(15, Math.max(1, currentDay + delta));
  setDayUI();

  // load from cache instantly
  if(cachedPatient){
    loadDayToForm(cachedPatient);
    return;
  }

  // fallback: fetch
  const snap = await getDoc(patientRef(currentId));
  if(snap.exists()){
    cachedPatient = ensureShape(snap.data());
    loadDayToForm(cachedPatient);
  }
}

// bind
els.openPatient.addEventListener('click', openPatient);
els.savePatient.addEventListener('click', savePatient);
els.saveDay.addEventListener('click', saveDay);
els.resetProgressDay.addEventListener('click', resetProgressDay);
els.copyLink.addEventListener('click', copyLink);

els.prevDay.addEventListener('click', ()=>goDay(-1));
els.nextDay.addEventListener('click', ()=>goDay(+1));

setDayUI();
