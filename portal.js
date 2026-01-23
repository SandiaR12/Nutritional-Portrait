import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// TU CONFIG (la que me diste)
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

const pill = document.getElementById("pillClient");
const chip = document.getElementById("chipStatus");

document.getElementById("kPlanId").textContent = planId || "—";

let PLAN = Array.from({length:15}).map((_,i)=>({
  day:i+1, label:`Día ${i+1}`, hint: i<7?"Semana 1":i<14?"Semana 2":"Semana 3",
  desayuno:"—", comida:"—", cena:"—", col1:"—", col2:"—"
}));

let selectedDay = 1;

function renderDays(){
  const wrap = document.getElementById("days");
  wrap.innerHTML = "";
  PLAN.forEach(d=>{
    const el = document.createElement("div");
    el.className = "day";
    el.innerHTML = `<div class="dayNum">${d.label}</div><div class="dayHint">${d.hint}</div>`;
    el.onclick = ()=>selectDay(d.day);
    wrap.appendChild(el);
  });
}

function selectDay(day){
  selectedDay = day;
  const d = PLAN[day-1];
  document.getElementById("dayTitle").textContent = d.label;
  document.getElementById("daySub").textContent = d.hint;
  document.getElementById("m1").textContent = d.desayuno || "—";
  document.getElementById("m2").textContent = d.comida || "—";
  document.getElementById("m3").textContent = d.cena || "—";
  document.getElementById("s1").textContent = d.col1 || "—";
  document.getElementById("s2").textContent = d.col2 || "—";
  document.getElementById("note").textContent = d.nota || "";
}

window.scrollToId = (id)=>{
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
};

async function loadPlan(){
  if(!planId){
    chip.textContent = "Falta ID en el link";
    chip.style.background = "rgba(255,255,255,.04)";
    pill.textContent = "Paciente: —";
    renderDays(); selectDay(1);
    return;
  }

  chip.textContent = "Cargando plan...";
  try{
    const ref = doc(db, "plans", planId);
    const snap = await getDoc(ref);

    if(!snap.exists()){
      chip.textContent = "Plan no encontrado";
      renderDays(); selectDay(1);
      return;
    }

    const data = snap.data();
    pill.textContent = `Paciente: ${data.paciente || "—"}`;
    document.getElementById("kEtapa").textContent = data.etapa || "—";
    document.getElementById("kRevision").textContent = data.revision || "—";

    if(Array.isArray(data.plan) && data.plan.length){
      PLAN = data.plan;
    }

    chip.textContent = "Plan activo";
    renderDays();
    selectDay(1);

  }catch(err){
    chip.textContent = "Error cargando plan";
    console.error(err);
  }
}

loadPlan();
