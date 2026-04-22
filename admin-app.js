import { db, auth } from './firebase.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

// ── Auth guard — block admin if not logged in ─────────────────
onAuthStateChanged(auth, function(user) {
    if (user) {
        // Logged in — show app, hide login screen
        var loginScreen = document.getElementById('loginScreen');
        var appScreen   = document.getElementById('appScreen');
        if (loginScreen) loginScreen.style.display = 'none';
        if (appScreen)   appScreen.style.display   = 'block';
        document.getElementById('adminEmail').textContent = user.email;
    } else {
        // Not logged in — show login screen
        var loginScreen = document.getElementById('loginScreen');
        var appScreen   = document.getElementById('appScreen');
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appScreen)   appScreen.style.display   = 'none';
    }
});

window.adminLogin = async function() {
    var email = document.getElementById('loginEmail').value.trim();
    var pass  = document.getElementById('loginPass').value;
    var errEl = document.getElementById('loginError');
    var btn   = document.getElementById('loginBtn');
    if (!email || !pass) { errEl.textContent = 'Ingresa correo y contraseña'; return; }
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch(e) {
        errEl.textContent = e.code === 'auth/invalid-credential'
            ? 'Correo o contraseña incorrectos'
            : 'Error: ' + e.message;
        btn.disabled = false;
        btn.textContent = 'Entrar';
    }
};

window.adminLogout = async function() {
    await signOut(auth);
};

// Estado
let currentPatientId = null;
let deletePatientId = null;
let currentEditingDay = 1;

// Elementos DOM
const patientsList = document.getElementById('patientsList');
const editSection = document.getElementById('editSection');
const patientsSection = document.getElementById('patientsSection');
const patientForm = document.getElementById('patientForm');
const newPatientBtn = document.getElementById('newPatientBtn');
const cancelEdit = document.getElementById('cancelEdit');
const generateLink = document.getElementById('generateLink');
const linkSection = document.getElementById('linkSection');
const patientLink = document.getElementById('patientLink');
const copyLink = document.getElementById('copyLink');
const calcLink = document.getElementById('calcLink');
const copyCalcLink = document.getElementById('copyCalcLink');
const deleteModal = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');

// Inicializar
loadPatients();

// Event Listeners
newPatientBtn.addEventListener('click', showNewPatientForm);
cancelEdit.addEventListener('click', hideEditSection);
patientForm.addEventListener('submit', savePatient);
generateLink.addEventListener('click', showPatientLink);
copyLink.addEventListener('click', copyLinkToClipboard);
copyCalcLink.addEventListener('click', copyCalcLinkToClipboard);
confirmDelete.addEventListener('click', deletePatient);
cancelDelete.addEventListener('click', () => deleteModal.style.display = 'none');

// Cargar pacientes
async function loadPatients() {
    try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        patientsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            patientsList.innerHTML = '<p style="text-align: center; color: var(--text-tertiary); padding: 40px;">No hay pacientes. ¡Crea el primero!</p>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            const card = createPatientCard(doc.id, patient);
            patientsList.appendChild(card);
        });
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar pacientes', 'error');
    }
}

function createPatientCard(id, patient) {
    const card = document.createElement('div');
    card.className = 'patient-card';
    
    const initial = patient.name ? patient.name.charAt(0).toUpperCase() : '?';
    
    card.innerHTML = `
        <div class="patient-card-header">
            <div class="patient-avatar">${initial}</div>
            <div class="patient-info">
                <h3>${patient.name}</h3>
                <p class="patient-meta">${patient.age} años • ${patient.weight} kg • ${patient.goal}</p>
            </div>
        </div>
        <div class="patient-actions">
            <button class="btn btn-info btn-small" onclick="window.editPatient('${id}')">
                ✏️ Editar
            </button>
            <button class="btn btn-success btn-small" onclick="window.openCalc('${id}')" title="Abrir calculadora del paciente">
                🧮 Calc
            </button>
            <button class="btn btn-danger btn-small" onclick="window.confirmDeletePatient('${id}')">
                🗑️ Eliminar
            </button>
        </div>
    `;
    
    return card;
}

window.openCalc = function(id) {
    const base = window.location.origin + window.location.pathname.replace('admin.html', '');
    window.open(`${base}calculadora-paciente.html?id=${id}`, '_blank');
};

window.editPatient = async function(id) {
    currentPatientId = id;
    const docRef = doc(db, 'patients', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const patient = docSnap.data();
        fillForm(patient);
        showEditSection();
        generateLink.style.display = 'inline-flex';
    }
};

window.confirmDeletePatient = function(id) {
    deletePatientId = id;
    deleteModal.style.display = 'flex';
};

async function deletePatient() {
    if (!deletePatientId) return;
    
    try {
        await deleteDoc(doc(db, 'patients', deletePatientId));
        
        // También eliminar progreso
        try {
            await deleteDoc(doc(db, 'progress', deletePatientId));
        } catch (e) {
            // Ignorar si no existe
        }
        
        showToast('Paciente eliminado', 'success');
        deleteModal.style.display = 'none';
        loadPatients();
        
        if (currentPatientId === deletePatientId) {
            hideEditSection();
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al eliminar', 'error');
    }
}

function showNewPatientForm() {
    currentPatientId = null;
    patientForm.reset();
    currentEditingDay = 1;
    renderDaysEditor();
    showEditSection();
    generateLink.style.display = 'none';
    linkSection.style.display = 'none';
    
    // Valores por defecto para macros
    document.getElementById('patientCalories').value = 2000;
    document.getElementById('patientProtein').value = 150;
    document.getElementById('patientCarbs').value = 250;
    document.getElementById('patientFats').value = 65;
}

function showEditSection() {
    patientsSection.style.display = 'none';
    editSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideEditSection() {
    editSection.style.display = 'none';
    patientsSection.style.display = 'block';
    currentPatientId = null;
}

function fillForm(patient) {
    document.getElementById('patientName').value = patient.name || '';
    document.getElementById('patientAge').value = patient.age || '';
    document.getElementById('patientSex').value = patient.sex || '';
    document.getElementById('patientWeight').value = patient.weight || '';
    document.getElementById('patientHeight').value = patient.height || '';
    document.getElementById('patientGoal').value = patient.goal || '';
    
    // NUEVO: Llenar fechas de período
    document.getElementById('dietStartDate').value = patient.dietStartDate || '';
    document.getElementById('dietEndDate').value = patient.dietEndDate || '';
    
    // Llenar campos de macros
    if (patient.macros) {
        document.getElementById('patientCalories').value = patient.macros.calories || 2000;
        document.getElementById('patientProtein').value = patient.macros.protein || 150;
        document.getElementById('patientCarbs').value = patient.macros.carbs || 250;
        document.getElementById('patientFats').value = patient.macros.fats || 65;
    } else {
        // Calcular valores automáticos basados en peso
        const weight = patient.weight || 70;
        const goal = (patient.goal || '').toLowerCase();
        
        if (goal.includes('pérdida') || goal.includes('bajar')) {
            document.getElementById('patientCalories').value = Math.round(weight * 26);
            document.getElementById('patientProtein').value = Math.round(weight * 2.2);
            document.getElementById('patientCarbs').value = Math.round(weight * 2);
            document.getElementById('patientFats').value = Math.round(weight * 0.8);
        } else if (goal.includes('ganancia') || goal.includes('músculo')) {
            document.getElementById('patientCalories').value = Math.round(weight * 40);
            document.getElementById('patientProtein').value = Math.round(weight * 2.5);
            document.getElementById('patientCarbs').value = Math.round(weight * 5);
            document.getElementById('patientFats').value = Math.round(weight * 1);
        } else {
            document.getElementById('patientCalories').value = Math.round(weight * 33);
            document.getElementById('patientProtein').value = Math.round(weight * 2);
            document.getElementById('patientCarbs').value = Math.round(weight * 3.5);
            document.getElementById('patientFats').value = Math.round(weight * 0.9);
        }
    }
    
    renderDaysEditor(patient.days);
}

function renderDaysEditor(existingDays = null) {
    const container = document.getElementById('daysContainer');
    const tabsContainer = document.getElementById('daysTabs');
    
    container.innerHTML = '';
    tabsContainer.innerHTML = '';
    
    // Crear tabs de días
    for (let i = 1; i <= 15; i++) {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `day-tab ${i === 1 ? 'active' : ''}`;
        tab.dataset.day = i;
        tab.textContent = `Día ${i}`;
        tab.addEventListener('click', () => switchDay(i));
        tabsContainer.appendChild(tab);
    }
    
    // Crear editores para los 15 días
    for (let day = 1; day <= 15; day++) {
        const dayEditor = document.createElement('div');
        dayEditor.className = `day-editor ${day === currentEditingDay ? 'active' : ''}`;
        dayEditor.dataset.day = day;
        
        const dayData = existingDays && existingDays[`day${day}`] ? existingDays[`day${day}`] : {};
        
        dayEditor.innerHTML = `
            <div class="meal-editor">
                <h4>🌅 Desayuno</h4>
                <textarea 
                    class="meal-input" 
                    data-day="${day}" 
                    data-meal="desayuno" 
                    id="day${day}_desayuno"
                    name="day${day}_desayuno"
                    placeholder="Ej: 2 huevos revueltos, 1 taza de avena con fruta, té verde">${dayData.desayuno || ''}</textarea>
            </div>
            
            <div class="meal-editor">
                <h4>🍎 Colación</h4>
                <textarea 
                    class="meal-input" 
                    data-day="${day}" 
                    data-meal="colacion1" 
                    id="day${day}_colacion1"
                    name="day${day}_colacion1"
                    placeholder="Ej: 1 manzana con 10 almendras">${dayData.colacion1 || ''}</textarea>
            </div>
            
            <div class="meal-editor">
                <h4>🍽️ Comida</h4>
                <textarea 
                    class="meal-input" 
                    data-day="${day}" 
                    data-meal="comida" 
                    id="day${day}_comida"
                    name="day${day}_comida"
                    placeholder="Ej: 150g pechuga de pollo, 1 taza de arroz integral, ensalada">${dayData.comida || ''}</textarea>
            </div>
            
            <div class="meal-editor">
                <h4>🥤 Colación</h4>
                <textarea 
                    class="meal-input" 
                    data-day="${day}" 
                    data-meal="colacion2" 
                    id="day${day}_colacion2"
                    name="day${day}_colacion2"
                    placeholder="Ej: Yogurt griego con granola">${dayData.colacion2 || ''}</textarea>
            </div>
            
            <div class="meal-editor">
                <h4>🌙 Cena</h4>
                <textarea 
                    class="meal-input" 
                    data-day="${day}" 
                    data-meal="cena" 
                    id="day${day}_cena"
                    name="day${day}_cena"
                    placeholder="Ej: Ensalada de atún, 2 rebanadas de pan integral">${dayData.cena || ''}</textarea>
            </div>
            <div style="background:#EFF6FF;border:2px dashed #93C5FD;border-radius:14px;padding:18px;margin-top:14px">
              <div style="font-size:.88rem;font-weight:800;color:#1D4ED8;margin-bottom:6px">📸 Imágenes de referencia</div>
              <div style="font-size:.74rem;color:#6B7585;margin-bottom:14px;line-height:1.5">
                Sube una foto de referencia para cada tiempo de comida.<br>
                El paciente la verá al abrir ese horario en la app.
              </div>
              ${(function(){
                var meals=[['desayuno','🌅 Desayuno'],['colacion1','🍎 Colación AM'],['comida','🍽️ Comida'],['colacion2','🥤 Colación PM'],['cena','🌙 Cena']];
                return meals.map(function(pair){
                  var m=pair[0], lbl=pair[1];
                  var ex=dayData['img_'+m]||'';
                  return '<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #DBEAFE">'
                    +'<div style="font-size:.75rem;font-weight:700;color:#374151;margin-bottom:6px">'+lbl+'</div>'
                    +'<div style="display:flex;align-items:center;gap:8px">'
                    +'<label style="display:inline-flex;align-items:center;gap:5px;background:#2563EB;color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.74rem;font-weight:700">'
                    +'📁 Subir imagen'
                    +'<input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="window.npImgUp(event,'+day+',\''+m+'\')"></label>'
                    +'<img id="np_p_'+day+'_'+m+'" src="'+ex+'" style="width:52px;height:52px;object-fit:cover;border-radius:8px;border:2px solid #93C5FD;display:'+(ex?'block':'none')+'">'
                    +'<button type="button" onclick="window.npImgClr('+day+',\''+m+'\')" style="display:'+(ex?'flex':'none')+';background:#FEE2E2;border:1px solid #FCA5A5;color:#DC2626;border-radius:6px;padding:5px 10px;font-size:.72rem;cursor:pointer;font-family:inherit">✕ Quitar</button>'
                    +'</div>'
                    +'<input type="hidden" id="np_d_'+day+'_'+m+'" value="'+ex+'">'
                    +'</div>';
                }).join('');
              })()}
            </div>
        `;
        
        container.appendChild(dayEditor);
    }
}

function switchDay(day) {
    currentEditingDay = day;
    
    // Actualizar tabs
    document.querySelectorAll('.day-tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.day) === day);
    });
    
    // Actualizar editores
    document.querySelectorAll('.day-editor').forEach(editor => {
        editor.classList.toggle('active', parseInt(editor.dataset.day) === day);
    });
}

async function savePatient(e) {
    e.preventDefault();
    console.log('🔥 Función savePatient ejecutada');
    
    // Recopilar datos básicos
    const patientData = {
        name: document.getElementById('patientName').value,
        age: parseInt(document.getElementById('patientAge').value),
        sex: document.getElementById('patientSex').value,
        weight: parseFloat(document.getElementById('patientWeight').value),
        height: parseInt(document.getElementById('patientHeight').value),
        goal: document.getElementById('patientGoal').value,
        // NUEVO: Guardar fechas de período
        dietStartDate: document.getElementById('dietStartDate').value,
        dietEndDate: document.getElementById('dietEndDate').value,
        // Macros — guardados en formato plano (fuente de verdad única)
        // patient-view.html lee: pat.calories || pat.macros.calories
        calories: parseInt(document.getElementById('patientCalories').value) || 2000,
        protein:  parseInt(document.getElementById('patientProtein').value)  || 150,
        carbs:    parseInt(document.getElementById('patientCarbs').value)    || 250,
        fats:     parseInt(document.getElementById('patientFats').value)     || 65,
        // Mantener macros.{} por compatibilidad con versiones anteriores
        macros: {
            calories: parseInt(document.getElementById('patientCalories').value) || 2000,
            protein:  parseInt(document.getElementById('patientProtein').value)  || 150,
            carbs:    parseInt(document.getElementById('patientCarbs').value)    || 250,
            fats:     parseInt(document.getElementById('patientFats').value)     || 65
        },
        // Campos flat que lee la calculadora
        calories: parseInt(document.getElementById('patientCalories').value),
        protein: parseInt(document.getElementById('patientProtein').value),
        carbs: parseInt(document.getElementById('patientCarbs').value),
        fats: parseInt(document.getElementById('patientFats').value),
        days: {},
        updatedAt: new Date().toISOString()
    };
    
    // Recopilar los 15 días usando data attributes
    console.log('📝 Recopilando datos de los 15 días...');
    for (let day = 1; day <= 15; day++) {
        const desayunoEl = document.querySelector(`[data-day="${day}"][data-meal="desayuno"]`);
        const colacion1El = document.querySelector(`[data-day="${day}"][data-meal="colacion1"]`);
        const comidaEl = document.querySelector(`[data-day="${day}"][data-meal="comida"]`);
        const colacion2El = document.querySelector(`[data-day="${day}"][data-meal="colacion2"]`);
        const cenaEl = document.querySelector(`[data-day="${day}"][data-meal="cena"]`);
        
        var _d = {
            desayuno: desayunoEl ? desayunoEl.value : '',
            colacion1: colacion1El ? colacion1El.value : '',
            comida: comidaEl ? comidaEl.value : '',
            colacion2: colacion2El ? colacion2El.value : '',
            cena: cenaEl ? cenaEl.value : ''
        };
        ['desayuno','colacion1','comida','colacion2','cena'].forEach(function(m){
            var el=document.getElementById('np_d_'+day+'_'+m);
            if(el&&el.value) _d['img_'+m]=el.value;
        });
        patientData.days[`day${day}`] = _d;
    }
    
    console.log('💾 Datos recopilados:', patientData);
    console.log('🔑 currentPatientId:', currentPatientId);
    
    try {
        console.log('🚀 Intentando guardar en Firebase...');
        if (currentPatientId) {
            // Actualizar existente
            console.log('📝 Actualizando paciente existente...');
            
            await Promise.race([
                setDoc(doc(db, 'patients', currentPatientId), patientData, { merge: true }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout después de 10 segundos')), 10000))
            ]);
            
            console.log('✅ Paciente actualizado en Firebase');
            showToast('Plan actualizado exitosamente', 'success');
        } else {
            // Crear nuevo
            console.log('➕ Creando nuevo paciente...');
            const newDocRef = doc(collection(db, 'patients'));
            currentPatientId = newDocRef.id;
            console.log('🆔 Nuevo ID generado:', currentPatientId);
            patientData.createdAt = new Date().toISOString();
            
            await Promise.race([
                setDoc(newDocRef, patientData),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout después de 10 segundos')), 10000))
            ]);
            
            console.log('✅ Paciente guardado en Firebase');
            
            // Inicializar progreso vacío
            console.log('📊 Inicializando progreso...');
            const progressData = {};
            for (let day = 1; day <= 15; day++) {
                progressData[`day${day}`] = {
                    desayuno: false,
                    colacion1: false,
                    comida: false,
                    colacion2: false,
                    cena: false
                };
            }
            
            await Promise.race([
                setDoc(doc(db, 'progress', currentPatientId), progressData),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout en progreso')), 10000))
            ]);
            
            console.log('✅ Progreso inicializado');
            showToast('Paciente creado exitosamente', 'success');
        }
        
        console.log('✅ TODO GUARDADO, mostrando botón de link...');
        generateLink.style.display = 'inline-flex';
        loadPatients();
        console.log('✅ PROCESO COMPLETADO');
    } catch (error) {
        console.error('❌ ERROR COMPLETO:', error);
        showToast('Error al guardar: ' + error.message, 'error');
    }
}

function showPatientLink() {
    if (!currentPatientId) return;
    
    const base = window.location.origin + window.location.pathname.replace('admin.html', '');
    
    const dietUrl = `${base}patient-view.html?id=${currentPatientId}`;
    const calcUrl = `${base}calculadora-paciente.html?id=${currentPatientId}`;
    
    patientLink.value = dietUrl;
    calcLink.value = calcUrl;
    
    linkSection.style.display = 'block';
    linkSection.scrollIntoView({ behavior: 'smooth' });
}

function copyLinkToClipboard() {
    patientLink.select();
    document.execCommand('copy');
    showToast('✅ Link de dieta copiado', 'success');
}

function copyCalcLinkToClipboard() {
    calcLink.select();
    document.execCommand('copy');
    showToast('✅ Link de calculadora copiado', 'success');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

window.npImgUp=function(e,day,meal){
  var f=e.target.files[0];
  if(!f)return;
  if(!f.type.startsWith('image/')){alert('Solo imágenes');return;}
  if(f.size>900000){alert('Máximo 900KB por imagen');return;}
  var r=new FileReader();
  r.onload=function(ev){
    var b=ev.target.result;
    var p=document.getElementById('np_p_'+day+'_'+meal);
    var d=document.getElementById('np_d_'+day+'_'+meal);
    if(p){p.src=b;p.style.display='block';}
    if(d)d.value=b;
    var btns=p&&p.parentNode&&p.parentNode.querySelectorAll('button[type=button]');
    if(btns&&btns[0])btns[0].style.display='flex';
  };
  r.readAsDataURL(f);
};
window.npImgClr=function(day,meal){
  var p=document.getElementById('np_p_'+day+'_'+meal);
  var d=document.getElementById('np_d_'+day+'_'+meal);
  if(p){p.src='';p.style.display='none';}
  if(d)d.value='';
  var btns=p&&p.parentNode&&p.parentNode.querySelectorAll('button[type=button]');
  if(btns&&btns[0])btns[0].style.display='none';
};
