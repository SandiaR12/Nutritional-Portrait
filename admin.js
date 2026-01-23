import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// TU CONFIG
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
const auth = getAuth(app);

const loginCard = document.getElementById("loginCard");
const editorCard = document.getElementById("editorCard");
const userPill = document.getElementById("userPill");

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnLoad = document.getElementById("btnLoad");
const btnSave = document.getElementById("btnSave");
const btnLink = document.getElementById("btnLink");

const loginMsg = document.getElementById("loginMsg");
const saveMsg = document.getElementById("saveMsg");
const outLink = document.getElementById("outLink");

const planIdEl = document.getElementById("planId");
const pacienteEl = document.getElementById("paciente");
const etapaEl = document.getElementById("etapa");
const revisionEl = document.getElementById("revision");

const desayunoEl = document.getElementById("desayuno");
const comidaEl = document.getElementById("comida");
const cenaEl = document.getElementById("cena");
const col1El = document.getElementById("col1");
const col2El = document.getElementById("col2");

let selectedDay = 1;
let CURRENT_PLAN = Array.from({length:15}).map((_,i)=>({
  day:i+1,
  label:`Día ${i+1}`,
  hint: i<7?"Semana 1":i<14?"Semana 2":"Semana 3",
  desayuno:"", comida:"", cena:"", col1:"", col2:""
}));

function renderDayPicker(){
  const wrap = document.getElementById("dayPicker");
  wrap.innerHTML = "";
  CURRENT_PLAN.forEach(d=>{
    const el = document.createElement("div");
    el.className = "day";
    el.innerHTML = `<div class="dayNum">${d.label}</div><div class="dayHint">${d.hint}</div>`;
    el.onclick = ()=>selectDay(d.day);
    wrap.appendChild(el);
  });
}

function selectDay(day){
  selectedDay = day;
  const d = CURRENT_PLAN[day-1];
  desayunoEl.value = d.desayuno || "";
  comidaEl.value = d.comida || "";
  cenaEl.value = d.cena || "";
  col1El.value = d.col1 || "";
  col2El.value = d.col2 || "";
}

function syncCurrentDay(){
  const d = CURRENT_PLAN[selectedDay-1];
  d.desayuno = desayunoEl.value;
  d.comida = comidaEl.value;
  d.cena = cenaEl.value;
  d.col1 = col1El.value;
  d.col2 = col2El.value;
}

[desayunoEl, comidaEl, cenaEl, col1El, col2El].forEach(el=>{
  el.addEventListener("input", ()=>syncCurrentDay());
});

btnLogin.addEventListener("click", async ()=>{
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value.trim();
  loginMsg.textContent = "Entrando...";
  try{
    await signInWithEmailAndPassword(auth, email, pass);
    loginMsg.textContent = "Listo ✅";
  }catch(e){
    loginMsg.textContent = "Error: correo o contraseña incorrectos.";
  }
});

btnLogout.addEventListener("click", async ()=>{
  await signOut(auth);
});

onAuthStateChanged(auth, (user)=>{
  if(user){
    userPill.textContent = user.email;
    loginCard.style.display = "none";
    editorCard.style.display = "block";
    renderDayPicker();
    selectDay(1);
  }else{
    userPill.textContent = "No autenticado";
    loginCard.style.display = "block";
    editorCard.style.display = "none";
  }
});

btnLoad.addEventListener("click", async ()=>{
  const planId = planIdEl.value.trim();
  if(!planId){ saveMsg.textContent = "Pon un Plan ID."; return; }

  saveMsg.textContent = "Cargando...";
  try{
    const ref = doc(db, "plans", planId);
    const snap = await getDoc(ref);

    if(!snap.exists()){
      saveMsg.textContent = "No existe. Se creará nuevo al guardar.";
      CURRENT_PLAN = Array.from({length:15}).map((_,i)=>({
        day:i+1,label:`Día ${i+1}`,hint:i<7?"Semana 1":i<14?"Semana 2":"Semana 3",
        desayuno:"",comida:"",cena:"",col1:"",col2:""
      }));
      renderDayPicker();
      selectDay(1);
      return;
    }

    const data = snap.data();
    pacienteEl.value = data.paciente || "";
    etapaEl.value = data.etapa || "";
    revisionEl.value = data.revision || "";
    CURRENT_PLAN = Array.isArray(data.plan) ? data.plan : CURRENT_PLAN;

    renderDayPicker();
    selectDay(1);
    saveMsg.textContent = "Cargado ✅";
  }catch(e){
    console.error(e);
    saveMsg.textContent = "Error cargando.";
  }
});

btnSave.addEventListener("click", async ()=>{
  const planId = planIdEl.value.trim();
  if(!planId){ saveMsg.textContent = "Pon un Plan ID."; return; }

  syncCurrentDay();

  saveMsg.textContent = "Guardando...";
  try{
    await setDoc(doc(db, "plans", planId), {
      paciente: pacienteEl.value.trim(),
      etapa: etapaEl.value.trim(),
      revision: revisionEl.value.trim(),
      plan: CURRENT_PLAN,
      updatedAt: Date.now()
    });

    saveMsg.textContent = "Guardado ✅";
  }catch(e){
    console.error(e);
    saveMsg.textContent = "Error guardando (revisa permisos).";
  }
});

btnLink.addEventListener("click", ()=>{
  const planId = planIdEl.value.trim();
  if(!planId){ outLink.textContent = "Pon un Plan ID."; return; }

  const base = window.location.origin + window.location.pathname.replace("admin.html","portal.html");
  const url = `${base}?id=${encodeURIComponent(planId)}`;
  outLink.textContent = url;
});
