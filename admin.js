import { db } from './firebase.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    deleteDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// Estado global
let currentPatientId = null;
let deletePatientId = null;

// Elementos del DOM
const patientsList = document.getElementById('patientsList');
const editSection = document.getElementById('editSection');
const patientForm = document.getElementById('patientForm');
const newPatientBtn = document.getElementById('newPatientBtn');
const cancelEdit = document.getElementById('cancelEdit');
const generateLink = document.getElementById('generateLink');
const linkSection = document.getElementById('linkSection');
const patientLink = document.getElementById('patientLink');
const copyLink = document.getElementById('copyLink');

// Containers dinámicos
const mealsContainer = document.getElementById('mealsContainer');
const requirementsContainer = document.getElementById('requirementsContainer');
const notesContainer = document.getElementById('notesContainer');

// Botones para agregar campos
const addMealBtn = document.getElementById('addMeal');
const addRequirementBtn = document.getElementById('addRequirement');
const addNoteBtn = document.getElementById('addNote');

// Modal
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

addMealBtn.addEventListener('click', () => addMealField());
addRequirementBtn.addEventListener('click', () => addRequirementField());
addNoteBtn.addEventListener('click', () => addNoteField());

confirmDelete.addEventListener('click', deletePatient);
cancelDelete.addEventListener('click', () => deleteModal.style.display = 'none');

// Funciones principales
async function loadPatients() {
    try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        patientsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            patientsList.innerHTML = '<p style="text-align: center; color: #999;">No hay pacientes registrados. ¡Crea el primero!</p>';
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            const patientCard = createPatientCard(doc.id, patient);
            patientsList.appendChild(patientCard);
        });
    } catch (error) {
        console.error('Error al cargar pacientes:', error);
        showToast('Error al cargar pacientes', 'error');
    }
}

function createPatientCard(id, patient) {
    const card = document.createElement('div');
    card.className = 'patient-card';
    card.innerHTML = `
        <div class="patient-info">
            <h3>${patient.name}</h3>
            <p class="patient-meta">
                ${patient.age} años • ${patient.weight} kg • Objetivo: ${patient.goal}
            </p>
        </div>
        <div class="patient-actions">
            <button class="btn btn-info btn-small" onclick="editPatient('${id}')">✏️ Editar</button>
            <button class="btn btn-danger btn-small" onclick="confirmDeletePatient('${id}')">🗑️ Eliminar</button>
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
        generateLink.style.display = 'inline-block';
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
        showToast('Paciente eliminado exitosamente', 'success');
        deleteModal.style.display = 'none';
        loadPatients();
        if (currentPatientId === deletePatientId) {
            hideEditSection();
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        showToast('Error al eliminar paciente', 'error');
    }
}

function showNewPatientForm() {
    currentPatientId = null;
    patientForm.reset();
    clearDynamicFields();
    addMealField();
    addRequirementField();
    addNoteField();
    showEditSection();
    generateLink.style.display = 'none';
    linkSection.style.display = 'none';
}

function showEditSection() {
    editSection.style.display = 'block';
    editSection.scrollIntoView({ behavior: 'smooth' });
}

function hideEditSection() {
    editSection.style.display = 'none';
    currentPatientId = null;
}

function fillForm(patient) {
    document.getElementById('patientName').value = patient.name || '';
    document.getElementById('patientAge').value = patient.age || '';
    document.getElementById('patientWeight').value = patient.weight || '';
    document.getElementById('patientHeight').value = patient.height || '';
    document.getElementById('patientGoal').value = patient.goal || '';
    
    clearDynamicFields();
    
    // Llenar comidas
    if (patient.meals && patient.meals.length > 0) {
        patient.meals.forEach(meal => addMealField(meal.time, meal.description));
    } else {
        addMealField();
    }
    
    // Llenar requerimientos
    if (patient.requirements && patient.requirements.length > 0) {
        patient.requirements.forEach(req => addRequirementField(req));
    } else {
        addRequirementField();
    }
    
    // Llenar notas
    if (patient.notes && patient.notes.length > 0) {
        patient.notes.forEach(note => addNoteField(note));
    } else {
        addNoteField();
    }
}

function clearDynamicFields() {
    mealsContainer.innerHTML = '';
    requirementsContainer.innerHTML = '';
    notesContainer.innerHTML = '';
}

function addMealField(time = '', description = '') {
    const field = document.createElement('div');
    field.className = 'dynamic-field meal-field';
    field.innerHTML = `
        <input type="text" placeholder="Hora (ej: Desayuno)" value="${time}" class="meal-time" required>
        <textarea placeholder="Descripción de la comida" class="meal-description" required>${description}</textarea>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">✕</button>
    `;
    mealsContainer.appendChild(field);
}

function addRequirementField(value = '') {
    const field = document.createElement('div');
    field.className = 'dynamic-field requirement-field';
    field.innerHTML = `
        <input type="text" placeholder="Requerimiento nutricional" value="${value}" class="requirement-input" required>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">✕</button>
    `;
    requirementsContainer.appendChild(field);
}

function addNoteField(value = '') {
    const field = document.createElement('div');
    field.className = 'dynamic-field note-field';
    field.innerHTML = `
        <textarea placeholder="Nota o recomendación" class="note-input" required>${value}</textarea>
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">✕</button>
    `;
    notesContainer.appendChild(field);
}

async function savePatient(e) {
    e.preventDefault();
    
    // Recopilar datos del formulario
    const patientData = {
        name: document.getElementById('patientName').value,
        age: parseInt(document.getElementById('patientAge').value),
        weight: parseFloat(document.getElementById('patientWeight').value),
        height: parseInt(document.getElementById('patientHeight').value),
        goal: document.getElementById('patientGoal').value,
        meals: [],
        requirements: [],
        notes: [],
        updatedAt: serverTimestamp()
    };
    
    // Recopilar comidas
    const mealFields = document.querySelectorAll('.meal-field');
    mealFields.forEach(field => {
        patientData.meals.push({
            time: field.querySelector('.meal-time').value,
            description: field.querySelector('.meal-description').value
        });
    });
    
    // Recopilar requerimientos
    const requirementFields = document.querySelectorAll('.requirement-input');
    requirementFields.forEach(field => {
        if (field.value.trim()) {
            patientData.requirements.push(field.value.trim());
        }
    });
    
    // Recopilar notas
    const noteFields = document.querySelectorAll('.note-input');
    noteFields.forEach(field => {
        if (field.value.trim()) {
            patientData.notes.push(field.value.trim());
        }
    });
    
    try {
        if (currentPatientId) {
            // Actualizar paciente existente
            await setDoc(doc(db, 'patients', currentPatientId), patientData, { merge: true });
            showToast('Plan actualizado exitosamente', 'success');
        } else {
            // Crear nuevo paciente
            const newDocRef = doc(collection(db, 'patients'));
            currentPatientId = newDocRef.id;
            patientData.createdAt = serverTimestamp();
            await setDoc(newDocRef, patientData);
            showToast('Paciente creado exitosamente', 'success');
        }
        
        generateLink.style.display = 'inline-block';
        loadPatients();
    } catch (error) {
        console.error('Error al guardar:', error);
        showToast('Error al guardar el plan', 'error');
    }
}

function showPatientLink() {
    if (!currentPatientId) return;
    
    const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
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
