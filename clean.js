import { db } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  if(!id){
    alert("Falta el id en el link. Ejemplo: clean.html?id=juan15");
  }

  const MEALS = ['desayuno','col1','comida','col2','cena'];
  const TOTAL = MEALS.length;

  const $ = (q)=>document.querySelector(q);

  const els = {
    days: $('#days'),
    dayTitle: $('#dayTitle'),
    pct: $('#pct'),
    fill: $('#fill'),
    barText: $('#barText'),
    resetAll: $('#resetAll'),
    resetDay: $('#resetDay'),
    concludeDay: $('#concludeDay'),
    patientName: $('#patientName'),
    periodoTop: $('#periodoTop'),
    cal: $('#cal'), pro: $('#pro'), carb: $('#carb'), fat: $('#fat'),
    dots: Array.from(document.querySelectorAll('.dot')),
    texts: {
      desayuno: $('#t_desayuno'),
      col1: $('#t_col1'),
      comida: $('#t_comida'),
      col2: $('#t_col2'),
      cena: $('#t_cena'),
    }
  };

  let currentDay = 1;
  let patient = null;

  const patientRef = ()=>doc(db, "patients", id);

  const ensureShape = (p)=>{
    if(!p.meta) p.meta = {cal:"—", pro:"—", carb:"—", fat:"—"};
    if(!p.plan) p.plan = {};
    if(!p.progress) p.progress = {};
    for(let d=1; d<=15; d++){
      const k = String(d);
      if(!p.plan[k]) p.plan[k] = {desayuno:"—", col1:"—", comida:"—", col2:"—", cena:"—"};
      if(!p.progress[k]) p.progress[k] = {desayuno:false,col1:false,comida:false,col2:false,cena:false, concluded:false};
    }
    return p;
  };

  const progressOf = (d)=>{
    const k = String(d);
    const m = patient.progress[k];
    const done = MEALS.reduce((acc,x)=>acc + (m[x] ? 1 : 0), 0);
    const pct = Math.round((done/TOTAL)*100);
    return {done,pct, concluded: !!m.concluded};
  };

  function setHeader(){
    els.patientName.textContent = patient.name || id;
    els.periodoTop.textContent = patient.periodo || "—";
    els.cal.textContent = patient.meta.cal ?? "—";
    els.pro.textContent = patient.meta.pro ?? "—";
    els.carb.textContent = patient.meta.carb ?? "—";
    els.fat.textContent = patient.meta.fat ?? "—";
  }

  function setBarColor(done){
    els.fill.classList.remove('red','green','silver');
    if(done >= 5) els.fill.classList.add('silver');
    else if(done >= 3) els.fill.classList.add('green');
    else els.fill.classList.add('red');
  }

  function renderDays(){
    els.days.innerHTML = '';
    for(let d=1; d<=15; d++){
      const {done,pct,concluded} = progressOf(d);
      const card = document.createElement('div');
      card.className = 'day' + ((done===5 || concluded) ? ' done' : '') + (d===currentDay ? ' sel' : '');
      card.innerHTML = `
        <div class="n">Día ${d}</div>
        <div class="hint">${done}/5 completado</div>
        <div class="mini"><div style="width:${pct}%"></div></div>
      `;
      card.addEventListener('click', ()=>{
        currentDay = d;
        renderDays();
        renderPlan();
        document.getElementById('plan').scrollIntoView({behavior:'smooth'});
      });
      els.days.appendChild(card);
    }
  }

  function renderPlan(){
    const {done,pct} = progressOf(currentDay);
    els.dayTitle.textContent = `Día ${currentDay}`;
    els.pct.textContent = pct + '%';
    els.fill.style.width = pct + '%';
    els.barText.textContent = `${done} / 5 completado`;
    setBarColor(done);

    const plan = patient.plan[String(currentDay)];
    els.texts.desayuno.textContent = plan.desayuno || "—";
    els.texts.col1.textContent = plan.col1 || "—";
    els.texts.comida.textContent = plan.comida || "—";
    els.texts.col2.textContent = plan.col2 || "—";
    els.texts.cena.textContent = plan.cena || "—";

    const m = patient.progress[String(currentDay)];
    els.dots.forEach(btn=>{
      const meal = btn.dataset.meal;
      btn.classList.toggle('on', !!m[meal]);
    });
  }

  async function pushProgress(){
    await updateDoc(patientRef(), {
      progress: patient.progress
    });
  }

  async function toggleMeal(meal){
    const k = String(currentDay);
    patient.progress[k][meal] = !patient.progress[k][meal];
    await pushProgress();
    renderDays();
    renderPlan();
  }

  async function concludeDay(){
    const k = String(currentDay);
    patient.progress[k].concluded = true;
    await pushProgress();
    renderDays();
    renderPlan();
  }

  async function resetDay(){
    const k = String(currentDay);
    patient.progress[k] = {desayuno:false,col1:false,comida:false,col2:false,cena:false, concluded:false};
    await pushProgress();
    renderDays();
    renderPlan();
  }

  async function resetAll(){
    for(let d=1; d<=15; d++){
      patient.progress[String(d)] = {desayuno:false,col1:false,comida:false,col2:false,cena:false, concluded:false};
    }
    await pushProgress();
    currentDay = 1;
    renderDays();
    renderPlan();
  }

  async function load(){
    const snap = await getDoc(patientRef());
    if(!snap.exists()){
      // create empty patient doc
      const empty = ensureShape({name:id, periodo:"—", meta:{cal:"—",pro:"—",carb:"—",fat:"—"}});
      await setDoc(patientRef(), empty);
      patient = empty;
    }else{
      patient = ensureShape(snap.data());
    }
    setHeader();
    renderDays();
    renderPlan();
  }

  // bind
  els.dots.forEach(btn => btn.addEventListener('click', ()=>toggleMeal(btn.dataset.meal)));
  els.concludeDay.addEventListener('click', concludeDay);
  els.resetDay.addEventListener('click', resetDay);
  els.resetAll.addEventListener('click', resetAll);

  load();
})();