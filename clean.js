(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'demo';

  const MEALS = ['desayuno','col1','comida','col2','cena'];
  const TOTAL = MEALS.length;
  const KEY = (s)=>`np_clean_${s}_${id}`;

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

  let state = JSON.parse(localStorage.getItem(KEY('state')) || '{}');
  if(!state.days) state.days = {};

  const ensureDay = (d)=>{
    if(!state.days[d]){
      state.days[d] = {desayuno:false,col1:false,comida:false,col2:false,cena:false, concluded:false};
    }
  };

  const save = ()=>localStorage.setItem(KEY('state'), JSON.stringify(state));

  const progressOf = (d)=>{
    ensureDay(d);
    const m = state.days[d];
    const done = MEALS.reduce((acc,k)=>acc + (m[k] ? 1 : 0), 0);
    const pct = Math.round((done/TOTAL)*100);
    return {done,pct, concluded: !!m.concluded};
  };

  let currentDay = 1;

  function setHeader(){
    els.patientName.textContent = localStorage.getItem(KEY('name')) || id;
    els.periodoTop.textContent = localStorage.getItem(KEY('periodo')) || '—';
    els.cal.textContent = localStorage.getItem(KEY('cal')) || '—';
    els.pro.textContent = localStorage.getItem(KEY('pro')) || '—';
    els.carb.textContent = localStorage.getItem(KEY('carb')) || '—';
    els.fat.textContent = localStorage.getItem(KEY('fat')) || '—';
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

    // dots
    const m = state.days[currentDay];
    els.dots.forEach(btn=>{
      const meal = btn.dataset.meal;
      btn.classList.toggle('on', !!m[meal]);
    });
  }

  function toggleMeal(meal){
    ensureDay(currentDay);
    state.days[currentDay][meal] = !state.days[currentDay][meal];
    // if user changes meals, don't auto remove concluded (keep it)
    save();
    renderDays();
    renderPlan();
  }

  function concludeDay(){
    ensureDay(currentDay);
    state.days[currentDay].concluded = true;
    save();
    renderDays();
  }

  function resetDay(){
    state.days[currentDay] = {desayuno:false,col1:false,comida:false,col2:false,cena:false, concluded:false};
    save();
    renderDays();
    renderPlan();
  }

  function resetAll(){
    localStorage.removeItem(KEY('state'));
    state = {days:{}};
    for(let d=1; d<=15; d++) ensureDay(d);
    currentDay = 1;
    save();
    renderDays();
    renderPlan();
  }

  // bind
  els.dots.forEach(btn => btn.addEventListener('click', ()=>toggleMeal(btn.dataset.meal)));
  els.concludeDay.addEventListener('click', concludeDay);
  els.resetDay.addEventListener('click', resetDay);
  els.resetAll.addEventListener('click', resetAll);

  // BOOT (guaranteed)
  function boot(){
    setHeader();
    for(let d=1; d<=15; d++) ensureDay(d);
    save();
    renderDays();
    renderPlan();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();