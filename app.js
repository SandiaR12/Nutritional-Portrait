import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// Obtener el ID del paciente desde la URL
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');

// Easter Egg: Konami Code
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            activateEasterEgg();
            konamiIndex = 0;
        }
    } else {
        konamiIndex = 0;
    }
});

function activateEasterEgg() {
    const modal = document.getElementById('easterEggModal');
    const content = document.getElementById('easterEggContent');
    
    // Crear confetti
    createConfetti();
    
    // Mensajes aleatorios divertidos
    const messages = [
        '¡Felicidades! Has desbloqueado el modo "Nutri-Gamer" 🎮<br><br>Sabías que: Las zanahorias NO mejoran tu visión nocturna (eso fue propaganda británica en la WWII) 🥕',
        '¡ULTRA COMBO! 🎊<br><br>Has ganado: +100 calorías imaginarias que no cuentan 🍕<br>(Disclaimer: Sí cuentan, lo siento)',
        '¡SECRETO DESBLOQUEADO! 🔓<br><br>El aguacate es técnicamente una baya. 🥑<br>Tu vida ya no será la misma.',
        '¡ACHIEVEMENT UNLOCKED! 🏆<br><br>"Maestro del Konami Code"<br><br>Tu nutriólogo está orgulloso... y confundido 😄',
        '¡WOW! Encontraste el Easter Egg 🥚<br><br>Fun fact: El brócoli y la coliflor son la misma especie de planta 🥦<br><br>*Mind Blown*'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    content.innerHTML = randomMessage;
    
    modal.style.display = 'block';
    
    // Reproducir sonido de logro (si quieres agregar audio)
    playSuccessSound();
}

function createConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }, i * 30);
    }
}

function playSuccessSound() {
    // Crear un simple beep usando Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Cerrar modal
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('easterEggModal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
});

// Cargar datos del paciente
async function loadPatientData() {
    if (!patientId) {
        showError();
        return;
    }
    
    try {
        const docRef = doc(db, 'patients', patientId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            displayPatientData(data);
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showError();
    } finally {
        hideLoading();
    }
}

function displayPatientData(data) {
    // Información del paciente
    const patientDetails = document.getElementById('patientDetails');
    patientDetails.innerHTML = `
        <div class="patient-info-grid">
            <div class="info-item">
                <div class="info-label">Nombre</div>
                <div class="info-value">${data.name || 'N/A'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Edad</div>
                <div class="info-value">${data.age || 'N/A'} años</div>
            </div>
            <div class="info-item">
                <div class="info-label">Peso Actual</div>
                <div class="info-value">${data.weight || 'N/A'} kg</div>
            </div>
            <div class="info-item">
                <div class="info-label">Altura</div>
                <div class="info-value">${data.height || 'N/A'} cm</div>
            </div>
            <div class="info-item">
                <div class="info-label">Objetivo</div>
                <div class="info-value">${data.goal || 'N/A'}</div>
            </div>
        </div>
    `;
    
    // Plan de comidas
    const mealsList = document.getElementById('mealsList');
    if (data.meals && data.meals.length > 0) {
        mealsList.innerHTML = data.meals.map(meal => `
            <div class="meal-item">
                <div class="meal-time">${meal.time}</div>
                <div class="meal-description">${meal.description}</div>
            </div>
        `).join('');
    } else {
        mealsList.innerHTML = '<p>No hay plan de comidas disponible.</p>';
    }
    
    // Requerimientos
    const requirementsList = document.getElementById('requirementsList');
    if (data.requirements && data.requirements.length > 0) {
        requirementsList.innerHTML = data.requirements.map(req => `
            <div class="requirement-item">${req}</div>
        `).join('');
    } else {
        requirementsList.innerHTML = '<p>No hay requerimientos especificados.</p>';
    }
    
    // Notas
    const notesList = document.getElementById('notesList');
    if (data.notes && data.notes.length > 0) {
        notesList.innerHTML = data.notes.map(note => `
            <div class="note-item">${note}</div>
        `).join('');
    } else {
        notesList.innerHTML = '<p>No hay notas adicionales.</p>';
    }
}

function showError() {
    document.getElementById('error').style.display = 'block';
    document.getElementById('patientInfo').style.display = 'none';
    document.getElementById('mealPlan').style.display = 'none';
    document.getElementById('requirements').style.display = 'none';
    document.getElementById('notes').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Iniciar la aplicación
loadPatientData();
