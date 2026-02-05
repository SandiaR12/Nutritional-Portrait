import { db } from './firebase.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

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
                Editar
            </button>
            <button class="btn btn-danger btn-small" onclick="window.confirmDeletePatient('${id}')">
                Eliminar
            </button>
        </div>
    `;
    
    return card;
}

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
    document.getElementById('patientWeight').value = patient.weight || '';
    document.getElementById('patientHeight').value = patient.height || '';
    document.getElementById('patientGoal').value = patient.goal || '';
    
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
        weight: parseFloat(document.getElementById('patientWeight').value),
        height: parseInt(document.getElementById('patientHeight').value),
        goal: document.getElementById('patientGoal').value,
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
        
        patientData.days[`day${day}`] = {
            desayuno: desayunoEl ? desayunoEl.value : '',
            colacion1: colacion1El ? colacion1El.value : '',
            comida: comidaEl ? comidaEl.value : '',
            colacion2: colacion2El ? colacion2El.value : '',
            cena: cenaEl ? cenaEl.value : ''
        };
    }
    
    console.log('💾 Datos recopilados:', patientData);
    console.log('🔑 currentPatientId:', currentPatientId);
    
    try {
        console.log('🚀 Intentando guardar en Firebase...');
        if (currentPatientId) {
            // Actualizar existente
            console.log('📝 Actualizando paciente existente...');
            console.log('Datos a guardar:', patientData);
            
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
            patientData.updatedAt = new Date().toISOString();
            
            console.log('Guardando en Firestore...');
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
        console.log('Botón generateLink:', generateLink);
        generateLink.style.display = 'inline-flex';
        console.log('Botón display ahora es:', generateLink.style.display);
        loadPatients();
        console.log('✅ PROCESO COMPLETADO');
    } catch (error) {
        console.error('❌ ERROR COMPLETO:', error);
        console.error('❌ Error mensaje:', error.message);
        console.error('❌ Error stack:', error.stack);
        showToast('Error al guardar: ' + error.message, 'error');
    }
}

function showPatientLink() {
    if (!currentPatientId) return;
    
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'patient-view.html');
    const link = `${baseUrl}?id=${currentPatientId}`;
    
    patientLink.value = link;
    linkSection.style.display = 'block';
    linkSection.scrollIntoView({ behavior: 'smooth' });
}

function copyLinkToClipboard() {
    patientLink.select();
    document.execCommand('copy');
    showToast('¡Link copiado al portapapeles!', 'success');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
