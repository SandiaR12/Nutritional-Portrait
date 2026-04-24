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
// ══ NUEVO: Firebase Storage para subir imagenes ══════════════════
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    uploadString,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

const storage = getStorage();

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

// ══ NUEVO: Archivos pendientes de subir a Storage ════════════════
// key: "day{N}_{meal}"
// value: File (imagen nueva) | 'REMOVED' (usuario dio "Quitar") | ausente (sin cambios)
let pendingUploads = {};

// ══ NUEVO: Foto de perfil pendiente ═══════════════════════════════
// null | Blob (nueva foto) | 'REMOVED' (usuario quitó la foto)
let pendingProfilePhoto = null;

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
    pendingUploads = {};  // limpiar estado de subidas anteriores
    pendingProfilePhoto = null;
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
    pendingUploads = {};  // limpiar estado
    pendingProfilePhoto = null;
    patientForm.reset();
    currentEditingDay = 1;

    // Reset foto de perfil
    var photoPreview = document.getElementById('profilePhotoPreview');
    var photoHidden  = document.getElementById('profilePhotoHidden');
    var photoInitial = document.getElementById('profilePhotoInitial');
    var photoClearBtn = document.getElementById('profilePhotoClearBtn');
    if (photoPreview) photoPreview.style.display = 'none';
    if (photoHidden)  photoHidden.value = '';
    if (photoInitial) { photoInitial.style.display = 'flex'; photoInitial.textContent = '?'; }
    if (photoClearBtn) photoClearBtn.style.display = 'none';

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
    pendingUploads = {};
}

function fillForm(patient) {
    document.getElementById('patientName').value = patient.name || '';
    document.getElementById('patientAge').value = patient.age || '';
    document.getElementById('patientSex').value = patient.sex || '';
    document.getElementById('patientWeight').value = patient.weight || '';
    document.getElementById('patientHeight').value = patient.height || '';
    document.getElementById('patientGoal').value = patient.goal || '';

    // Foto de perfil (si existe)
    var existingPhoto = patient.photoURL || '';
    var photoPreview = document.getElementById('profilePhotoPreview');
    var photoHidden  = document.getElementById('profilePhotoHidden');
    var photoInitial = document.getElementById('profilePhotoInitial');
    var photoClearBtn = document.getElementById('profilePhotoClearBtn');
    if (photoPreview) {
        if (existingPhoto) {
            photoPreview.src = existingPhoto;
            photoPreview.style.display = 'block';
            if (photoInitial) photoInitial.style.display = 'none';
            if (photoClearBtn) photoClearBtn.style.display = 'inline-flex';
        } else {
            photoPreview.style.display = 'none';
            if (photoInitial) {
                photoInitial.style.display = 'flex';
                photoInitial.textContent = (patient.name || '?')[0].toUpperCase();
            }
            if (photoClearBtn) photoClearBtn.style.display = 'none';
        }
    }
    if (photoHidden) photoHidden.value = existingPhoto;
    pendingProfilePhoto = null;  // resetear
    
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
              <div style="font-size:.9rem;font-weight:800;color:#1D4ED8;margin-bottom:8px">&#128248; Imagenes de referencia por comida</div>
              <div style="font-size:.74rem;color:#6B7585;margin-bottom:14px;line-height:1.5">Sube una foto para cada tiempo. Se guarda en Firebase Storage (no ocupa espacio en la base de datos). Se comprime automaticamente.</div>
              ${(function(){
                var meals=[['desayuno','Desayuno'],['colacion1','Colacion AM'],['comida','Comida'],['colacion2','Colacion PM'],['cena','Cena']];
                return meals.map(function(pair){
                  var m=pair[0], lbl=pair[1];
                  var ex=(dayData['img_'+m]||'');
                  return '<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #DBEAFE">'
                    +'<div style="font-size:.75rem;font-weight:700;color:#374151;margin-bottom:6px">'+lbl+'</div>'
                    +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
                    +'<label style="display:inline-flex;align-items:center;gap:5px;background:#2563EB;color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.74rem;font-weight:700">'
                    +'Subir imagen'
                    +'<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none" data-day="'+day+'" data-meal="'+m+'" onchange="window.npUp(this)">'
                    +'</label>'
                    +'<img id="np_p_'+day+'_'+m+'" src="'+ex+'" style="width:52px;height:52px;object-fit:cover;border-radius:8px;border:2px solid #93C5FD;display:'+(ex?'block':'none')+'">'
                    +'<button type="button" data-day="'+day+'" data-meal="'+m+'" onclick="window.npClr(this)" style="display:'+(ex?'flex':'none')+';align-items:center;background:#FEE2E2;border:1px solid #FCA5A5;color:#DC2626;border-radius:6px;padding:5px 10px;font-size:.72rem;cursor:pointer;font-family:inherit">Quitar</button>'
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

// ══════════════════════════════════════════════════════════════════
//  NUEVA FUNCIÓN: Subir un File a Firebase Storage
// ══════════════════════════════════════════════════════════════════
async function uploadFileToStorage(pid, day, meal, file) {
    const path = `diet-images/${pid}/day${day}_${meal}`;
    const sRef = storageRef(storage, path);
    const snap = await uploadBytes(sRef, file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: 'public,max-age=31536000'
    });
    return await getDownloadURL(snap.ref);
}

// ══════════════════════════════════════════════════════════════════
//  NUEVA FUNCIÓN: Migrar base64 existente a Storage
// ══════════════════════════════════════════════════════════════════
async function uploadBase64ToStorage(pid, day, meal, dataUrl) {
    const path = `diet-images/${pid}/day${day}_${meal}`;
    const sRef = storageRef(storage, path);
    const snap = await uploadString(sRef, dataUrl, 'data_url', {
        cacheControl: 'public,max-age=31536000'
    });
    return await getDownloadURL(snap.ref);
}

// ══════════════════════════════════════════════════════════════════
//  SAVE PATIENT — ahora sube imagenes a Storage, no a Firestore
// ══════════════════════════════════════════════════════════════════
async function savePatient(e) {
    e.preventDefault();
    console.log('🔥 Función savePatient ejecutada');
    
    const saveBtn = e.target.querySelector('button[type=submit]');
    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Guardando...';
    }
    
    try {
        // 1. Determinar el ID del paciente (crear nuevo si no existe)
        let patientId = currentPatientId;
        let isNew = false;
        if (!patientId) {
            const newDocRef = doc(collection(db, 'patients'));
            patientId = newDocRef.id;
            isNew = true;
            console.log('🆔 Nuevo ID generado:', patientId);
        }
        
        // 2. Recopilar datos básicos del paciente
        const patientData = {
            name: document.getElementById('patientName').value,
            age: parseInt(document.getElementById('patientAge').value),
            sex: document.getElementById('patientSex').value,
            weight: parseFloat(document.getElementById('patientWeight').value),
            height: parseInt(document.getElementById('patientHeight').value),
            goal: document.getElementById('patientGoal').value,
            dietStartDate: document.getElementById('dietStartDate').value,
            dietEndDate: document.getElementById('dietEndDate').value,
            calories: parseInt(document.getElementById('patientCalories').value) || 2000,
            protein:  parseInt(document.getElementById('patientProtein').value)  || 150,
            carbs:    parseInt(document.getElementById('patientCarbs').value)    || 250,
            fats:     parseInt(document.getElementById('patientFats').value)     || 65,
            macros: {
                calories: parseInt(document.getElementById('patientCalories').value) || 2000,
                protein:  parseInt(document.getElementById('patientProtein').value)  || 150,
                carbs:    parseInt(document.getElementById('patientCarbs').value)    || 250,
                fats:     parseInt(document.getElementById('patientFats').value)     || 65
            },
            days: {},
            updatedAt: new Date().toISOString()
        };

        // 2.5. Foto de perfil
        const photoHidden = document.getElementById('profilePhotoHidden');
        const existingPhoto = photoHidden ? photoHidden.value : '';
        if (pendingProfilePhoto === 'REMOVED') {
            patientData.photoURL = '';   // borrar
        } else if (pendingProfilePhoto instanceof Blob) {
            // Subir nueva foto
            if (saveBtn) saveBtn.innerHTML = '⏳ Subiendo foto de perfil...';
            const photoPath = `profile-photos/${patientId}`;
            const photoRef = storageRef(storage, photoPath);
            const photoSnap = await uploadBytes(photoRef, pendingProfilePhoto, {
                contentType: 'image/webp',
                cacheControl: 'public,max-age=31536000'
            });
            patientData.photoURL = await getDownloadURL(photoSnap.ref);
        } else if (existingPhoto) {
            patientData.photoURL = existingPhoto;   // conservar
        }
        if (isNew) patientData.createdAt = new Date().toISOString();
        
        // 3. Construir lista de tareas de imagen (subidas + migraciones)
        const MEALS = ['desayuno','colacion1','comida','colacion2','cena'];
        const imageTasks = [];
        
        for (let day = 1; day <= 15; day++) {
            for (const meal of MEALS) {
                const key = `day${day}_${meal}`;
                const hiddenInput = document.getElementById(`np_d_${day}_${meal}`);
                const existing = hiddenInput ? hiddenInput.value : '';
                const pending = pendingUploads[key];
                
                if (pending === 'REMOVED') {
                    // Usuario dio "Quitar" — no hacer nada (no añadir img_)
                    continue;
                }
                if (pending instanceof Blob) {
                    // Nueva imagen subida (File o Blob comprimido) — hay que mandarla a Storage
                    imageTasks.push({ day, meal, type: 'file', data: pending });
                } else if (existing) {
                    if (existing.startsWith('data:')) {
                        // Base64 antiguo en Firestore — migrar a Storage
                        imageTasks.push({ day, meal, type: 'base64', data: existing });
                    } else if (existing.startsWith('http')) {
                        // Ya es URL de Storage — mantener tal cual
                        imageTasks.push({ day, meal, type: 'url', data: existing });
                    }
                }
            }
        }
        
        console.log(`📸 ${imageTasks.length} imágenes a procesar`);
        
        // 4. Subir imágenes a Storage en paralelo (lotes de 5)
        const imageUrls = {};  // { "day1_desayuno": "https://..." }
        const total = imageTasks.length;
        let done = 0;
        
        const BATCH = 5;
        for (let i = 0; i < imageTasks.length; i += BATCH) {
            const batch = imageTasks.slice(i, i + BATCH);
            
            await Promise.all(batch.map(async (task) => {
                const key = `day${task.day}_${task.meal}`;
                
                if (task.type === 'file') {
                    imageUrls[key] = await uploadFileToStorage(patientId, task.day, task.meal, task.data);
                } else if (task.type === 'base64') {
                    imageUrls[key] = await uploadBase64ToStorage(patientId, task.day, task.meal, task.data);
                } else if (task.type === 'url') {
                    imageUrls[key] = task.data;
                }
                
                done++;
                if (saveBtn) {
                    saveBtn.innerHTML = `⏳ Subiendo ${done}/${total}...`;
                }
            }));
        }
        
        // 5. Construir el objeto days con textos + URLs (sin base64)
        for (let day = 1; day <= 15; day++) {
            const desayunoEl  = document.querySelector(`[data-day="${day}"][data-meal="desayuno"]`);
            const colacion1El = document.querySelector(`[data-day="${day}"][data-meal="colacion1"]`);
            const comidaEl    = document.querySelector(`[data-day="${day}"][data-meal="comida"]`);
            const colacion2El = document.querySelector(`[data-day="${day}"][data-meal="colacion2"]`);
            const cenaEl      = document.querySelector(`[data-day="${day}"][data-meal="cena"]`);
            
            const dayObj = {
                desayuno:  desayunoEl  ? desayunoEl.value  : '',
                colacion1: colacion1El ? colacion1El.value : '',
                comida:    comidaEl    ? comidaEl.value    : '',
                colacion2: colacion2El ? colacion2El.value : '',
                cena:      cenaEl      ? cenaEl.value      : ''
            };
            
            for (const meal of MEALS) {
                const url = imageUrls[`day${day}_${meal}`];
                if (url) dayObj[`img_${meal}`] = url;
            }
            
            patientData.days[`day${day}`] = dayObj;
        }
        
        // 6. Guardar en Firestore (ahora pesa ~15KB en vez de ~6MB)
        if (saveBtn) saveBtn.innerHTML = '⏳ Guardando en base de datos...';
        console.log('🚀 Guardando en Firestore...');
        
        await setDoc(doc(db, 'patients', patientId), patientData);
        console.log('✅ Paciente guardado en Firebase');
        
        // 7. Si es nuevo, inicializar progreso vacío
        if (isNew) {
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
            await setDoc(doc(db, 'progress', patientId), progressData);
            console.log('✅ Progreso inicializado');
            currentPatientId = patientId;
        }
        
        pendingUploads = {};  // limpiar estado
        generateLink.style.display = 'inline-flex';
        loadPatients();
        showToast(isNew ? 'Paciente creado exitosamente' : 'Plan actualizado exitosamente', 'success');
        console.log('✅ PROCESO COMPLETADO');
        
    } catch (error) {
        console.error('❌ ERROR COMPLETO:', error);
        showToast('Error al guardar: ' + error.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHtml;
        }
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

// ══════════════════════════════════════════════════════════════════
//  FUNCIÓN: Comprimir imagen para ahorrar espacio en Storage
// ══════════════════════════════════════════════════════════════════
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Error al leer imagen'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Error al decodificar imagen'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Reducir a máximo 600×600px (suficiente para preview en móvil)
                const maxSize = 600;
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d', { alpha: false });
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a WEBP con calidad 0.7 (reduce ~70% del tamaño)
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return resolve(file);  // fallback
                        resolve(blob);
                    },
                    'image/webp',
                    0.7
                );
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ══════════════════════════════════════════════════════════════════
//  npUp — guarda el File en memoria (comprimido)
// ══════════════════════════════════════════════════════════════════
window.npUp = async function(input){
    var day = input.dataset.day, meal = input.dataset.meal;
    var f = input.files[0];
    if(!f) return;
    if(!f.type.startsWith('image/')){ alert('Solo imagenes (jpg, png, webp, gif)'); return; }
    if(f.size > 10000000){ alert('Imagen muy grande. Maximo 10MB.'); return; }
    
    // Mostrar indicador mientras se comprime
    var p = document.getElementById('np_p_' + day + '_' + meal);
    if(p) { p.style.opacity = '0.5'; }
    
    try {
        // Comprimir imagen (reduce tamaño ~70%)
        var compressed = await compressImage(f);
        console.log(`📦 ${meal} (día ${day}): ${(f.size/1024).toFixed(1)}KB → ${(compressed.size/1024).toFixed(1)}KB`);
        
        // Guardar File comprimido en memoria
        pendingUploads[`day${day}_${meal}`] = compressed;
        
        // Mostrar vista previa
        var r = new FileReader();
        r.onload = function(ev){
            var b = ev.target.result;
            if(p){ p.src = b; p.style.display = 'block'; p.style.opacity = '1'; }
            var row = input.closest('div[style]');
            if(row){ var btn = row.querySelector('button[type=button]'); if(btn) btn.style.display = 'flex'; }
        };
        r.readAsDataURL(compressed);
    } catch (err) {
        console.error('Error comprimiendo:', err);
        if(p) { p.style.opacity = '1'; }
        alert('Error al procesar la imagen: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
//  npClr — marca la imagen como eliminada
// ══════════════════════════════════════════════════════════════════
window.npClr = function(btn){
    var day = btn.dataset.day, meal = btn.dataset.meal;
    var p = document.getElementById('np_p_' + day + '_' + meal);
    var d = document.getElementById('np_d_' + day + '_' + meal);
    if(p){ p.src = ''; p.style.display = 'none'; }
    if(d) d.value = '';  // limpiar input hidden (ya no hay URL existente)
    pendingUploads[`day${day}_${meal}`] = 'REMOVED';  // marcar como borrada
    btn.style.display = 'none';
};

// ══════════════════════════════════════════════════════════════════
//  Foto de perfil — Subir
// ══════════════════════════════════════════════════════════════════
window.npProfileUp = async function(input){
    var f = input.files[0];
    if(!f) return;
    if(!f.type.startsWith('image/')){ alert('Solo imagenes'); return; }
    if(f.size > 10000000){ alert('Imagen muy grande. Maximo 10MB.'); return; }

    var preview = document.getElementById('profilePhotoPreview');
    var initial = document.getElementById('profilePhotoInitial');
    var clearBtn = document.getElementById('profilePhotoClearBtn');
    if(preview) preview.style.opacity = '0.5';

    try {
        var compressed = await compressImage(f);
        console.log(`📦 Foto perfil: ${(f.size/1024).toFixed(1)}KB → ${(compressed.size/1024).toFixed(1)}KB`);
        pendingProfilePhoto = compressed;

        var r = new FileReader();
        r.onload = function(ev){
            if(preview){
                preview.src = ev.target.result;
                preview.style.display = 'block';
                preview.style.opacity = '1';
            }
            if(initial) initial.style.display = 'none';
            if(clearBtn) clearBtn.style.display = 'inline-flex';
        };
        r.readAsDataURL(compressed);
    } catch(err){
        if(preview) preview.style.opacity = '1';
        alert('Error: ' + err.message);
    }
};

// ══════════════════════════════════════════════════════════════════
//  Foto de perfil — Quitar
// ══════════════════════════════════════════════════════════════════
window.npProfileClr = function(){
    var preview = document.getElementById('profilePhotoPreview');
    var hidden  = document.getElementById('profilePhotoHidden');
    var initial = document.getElementById('profilePhotoInitial');
    var clearBtn = document.getElementById('profilePhotoClearBtn');
    if(preview){ preview.src = ''; preview.style.display = 'none'; }
    if(hidden)  hidden.value = '';
    if(initial){ initial.style.display = 'flex'; initial.textContent = (document.getElementById('patientName').value || '?')[0].toUpperCase(); }
    if(clearBtn) clearBtn.style.display = 'none';
    pendingProfilePhoto = 'REMOVED';
};
