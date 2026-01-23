(function(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'demo';

  const MEALS = ['desayuno','col1','comida','col2','cena'];
  const TOTAL = MEALS.length;

  const key = (suffix)=>`np_pro_${suffix}_${id}`;

  // header fields (admin later)
  document.getElementById('patientName').textContent = localStorage.getItem(key('name')) || id;
  document.getElementById('periodo').textContent = localStorage.getItem(key('periodo')) || '—';

  const setMeta = (k, el)=>{ const v = localStorage.getItem(key(k)) || '—'; document.getElementById(el).textContent = v; };
  setMeta('cal','cal'); setMeta('pro','pro'); setMeta('carb','carb'); setMeta('fat','fat');

  let state = JSON.parse(localStorage.getItem(key('state')) || '{}');
  if(!state.days) state.days = {};

  const ensureDay = (d)=>{
    if(!state.days[d]) state.days[d] = {desayuno:false,col1:false,comida:false,col2:false,cena:false};
  };

  let currentDay = 1;

  const progressOf = (d)=>{
    ensureDay(d);
    const m = state.days[d];
    const done = MEALS.filter(x=>m[x]).length;
    const pct = Math.round((done/TOTAL)*100);
    return {done,pct};
  };

  const save = ()=>localStorage.setItem(key('state'), JSON.stringify(state));

  const daysGrid = document.getElementById('daysGrid');

  function renderDays(){
    daysGrid.innerHTML='';
    for(let d=1; d<=15; d++){
      const {done,pct} = progressOf(d);
      const el = document.createElement('div');
      el.className = 'day' + (done===5 ? ' completed' : '');
      el.innerHTML = `
        <div class="dayNum">Día ${d}</div>
        <div class="dayHint">${done}/5 completado</div>
        <div class="dayBar"><div class="dayFill" style="width:${pct}%"></div></div>
      `;
      el.onclick = ()=>{
        currentDay = d;
        renderPlan();
        document.getElementById('plan').scrollIntoView({behavior:'smooth'});
      };
      daysGrid.appendChild(el);
    }
  }

  function setBarColor(done){
    const fill = document.getElementById('barFill');
    fill.classList.remove('red','green','silver');
    if(done>=5) fill.classList.add('silver');
    else if(done>=3) fill.classList.add('green');
    else fill.classList.add('red');
  }

  function renderPlan(){
    document.getElementById('dayTitle').textContent = `Día ${currentDay}`;
    const {done,pct} = progressOf(currentDay);
    document.getElementById('pct').textContent = pct+'%';
    const fill = document.getElementById('barFill');
    fill.style.width = pct+'%';
    document.getElementById('barText').textContent = `${done} / 5 completado`;
    setBarColor(done);

    // dots
    const m = state.days[currentDay];
    document.querySelectorAll('.dot').forEach(btn=>{
      const meal = btn.dataset.meal;
      btn.classList.toggle('done', !!m[meal]);
    });
  }

  document.querySelectorAll('.dot').forEach(btn=>{
    btn.onclick = ()=>{
      const meal = btn.dataset.meal;
      ensureDay(currentDay);
      state.days[currentDay][meal] = !state.days[currentDay][meal];
      save();
      renderPlan();
      renderDays();
    };
  });

  document.getElementById('resetAll').onclick = ()=>{
    localStorage.removeItem(key('state'));
    state = {days:{}};
    currentDay = 1;
    renderDays();
    renderPlan();
  };

  // init
  for(let d=1; d<=15; d++) ensureDay(d);
  save();
  renderDays();
  renderPlan();
})();