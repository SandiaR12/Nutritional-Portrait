import { db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// Obtener ID del paciente de la URL
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');

// Estado global
let patientData = null;
let progressData = {};
let currentDay = null;

// EASTER EGG: Konami Code
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
    
    createConfetti(100);
    
    const messages = [
        '¡ULTRA COMBO! 🎮<br><br>Has desbloqueado el modo Nutri-Gamer. Todas las calorías ahora cuentan doble... ¡de saludables! 💪',
        '¡ACHIEVEMENT UNLOCKED! 🏆<br><br>"Maestro del Konami Code"<br><br>Fun fact: El brócoli tiene más proteína que el bistec... ¡por caloría! 🥦',
        '¡SECRETO REVELADO! 🔓<br><br>Las zanahorias NO mejoran tu visión nocturna. Fue propaganda británica en la WWII 🥕',
        '¡LEGENDARY! ⭐<br><br>Has encontrado el easter egg. Ricardo está orgulloso de ti 😎',
        '¡COMBO x999! 🎊<br><br>El aguacate es técnicamente una baya gigante 🥑<br><br>Tu mundo nunca será igual.'
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    content.innerHTML = randomMessage;
    
    modal.style.display = 'flex';
    playSuccessSound();
}

window.closeEasterEgg = function() {
    document.getElementById('easterEggModal').style.display = 'none';
};

function createConfetti(count) {
    const container = document.getElementById('confettiContainer');
    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5AC8FA', '#AF52DE'];
    
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.animationDelay = (Math.random() * 0.5) + 's';
            container.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }, i * 20);
    }
}

function playSuccessSound() {
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

// Inicializar app
async function init() {
    if (!patientId) {
        showError();
        return;
    }
    
    try {
        await loadPatientData();
        await loadProgressData();
        renderPatientInfo();
        renderCalendar();
        updateOverallProgress();
        hideLoading();
    } catch (error) {
        console.error('Error:', error);
        showError();
        hideLoading();
    }
}

async function loadPatientData() {
    const docRef = doc(db, 'patients', patientId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        patientData = docSnap.data();
    } else {
        throw new Error('Patient not found');
    }
}

async function loadProgressData() {
    const progressRef = doc(db, 'progress', patientId);
    const progressSnap = await getDoc(progressRef);
    
    if (progressSnap.exists()) {
        progressData = progressSnap.data();
    } else {
        // Inicializar progreso vacío
        progressData = {};
        for (let day = 1; day <= 15; day++) {
            progressData[`day${day}`] = {
                desayuno: false,
                colacion1: false,
                comida: false,
                colacion2: false,
                cena: false
            };
        }
        await setDoc(progressRef, progressData);
    }
}

function renderPatientInfo() {
    // Avatar con inicial
    const avatar = document.getElementById('patientAvatar');
    const initial = patientData.name ? patientData.name.charAt(0).toUpperCase() : '?';
    avatar.textContent = initial;
    
    // Nombre
    document.getElementById('patientName').textContent = patientData.name || 'Paciente';
    
    // Stats
    const stats = document.getElementById('patientStats');
    stats.innerHTML = `
        <div class="stat-item">
            <span class="stat-item-label">Edad</span>
            <span class="stat-item-value">${patientData.age || '-'} años</span>
        </div>
        <div class="stat-item">
            <span class="stat-item-label">Peso</span>
            <span class="stat-item-value">${patientData.weight || '-'} kg</span>
        </div>
        <div class="stat-item">
            <span class="stat-item-label">Altura</span>
            <span class="stat-item-value">${patientData.height || '-'} cm</span>
        </div>
        <div class="stat-item">
            <span class="stat-item-label">Objetivo</span>
            <span class="stat-item-value">${patientData.goal || '-'}</span>
        </div>
    `;
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    for (let day = 1; day <= 15; day++) {
        const dayData = progressData[`day${day}`];
        const completedMeals = Object.values(dayData).filter(v => v).length;
        const isCompleted = completedMeals === 5;
        
        const card = document.createElement('div');
        card.className = `day-card ${isCompleted ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-label">Día</div>
            <div class="progress-indicator">
                ${[...Array(5)].map((_, i) => `
                    <div class="progress-dot ${i < completedMeals ? 'completed' : ''}"></div>
                `).join('')}
            </div>
            <div class="day-meals">${completedMeals}/5 comidas</div>
        `;
        
        card.addEventListener('click', () => openDayDetails(day));
        grid.appendChild(card);
    }
}

function openDayDetails(day) {
    currentDay = day;
    const dayData = progressData[`day${day}`];
    
    document.getElementById('dayTitle').textContent = `Día ${day}`;
    
    // Actualizar progreso del día
    updateDayProgress(dayData);
    
    // Renderizar comidas
    const mealsList = document.getElementById('mealsList');
    const meals = getMealsForDay(day);
    
    mealsList.innerHTML = meals.map((meal, index) => {
        const mealKey = ['desayuno', 'colacion1', 'comida', 'colacion2', 'cena'][index];
        const isCompleted = dayData[mealKey];
        
        return `
            <div class="meal-item ${isCompleted ? 'completed' : ''}" data-meal="${mealKey}">
                <div class="meal-checkbox">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <div class="meal-content">
                    <div class="meal-name">${meal.name}</div>
                    <div class="meal-description">${meal.description}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Event listeners para marcar comidas
    document.querySelectorAll('.meal-item').forEach(item => {
        item.addEventListener('click', () => toggleMeal(item.dataset.meal));
    });
    
    // Mostrar detalles
    document.getElementById('dayDetails').style.display = 'block';
    document.getElementById('dayDetails').scrollIntoView({ behavior: 'smooth' });
}

function getMealsForDay(day) {
    const dayMeals = patientData.days && patientData.days[`day${day}`] 
        ? patientData.days[`day${day}`]
        : null;
    
    if (dayMeals) {
        return [
            { name: 'Desayuno', description: dayMeals.desayuno || 'No especificado' },
            { name: 'Colación', description: dayMeals.colacion1 || 'No especificado' },
            { name: 'Comida', description: dayMeals.comida || 'No especificado' },
            { name: 'Colación', description: dayMeals.colacion2 || 'No especificado' },
            { name: 'Cena', description: dayMeals.cena || 'No especificado' }
        ];
    }
    
    return [
        { name: 'Desayuno', description: 'Pendiente de configurar' },
        { name: 'Colación', description: 'Pendiente de configurar' },
        { name: 'Comida', description: 'Pendiente de configurar' },
        { name: 'Colación', description: 'Pendiente de configurar' },
        { name: 'Cena', description: 'Pendiente de configurar' }
    ];
}

async function toggleMeal(mealKey) {
    const dayData = progressData[`day${currentDay}`];
    dayData[mealKey] = !dayData[mealKey];
    
    // Guardar en Firebase
    await updateProgress();
    
    // Actualizar UI
    updateDayProgress(dayData);
    renderCalendar();
    updateOverallProgress();
    
    // Re-renderizar lista de comidas
    openDayDetails(currentDay);
    
    // Verificar si completó el día
    const completedMeals = Object.values(dayData).filter(v => v).length;
    if (completedMeals === 5) {
        celebrateDayCompletion();
    }
}

function updateDayProgress(dayData) {
    const completedMeals = Object.values(dayData).filter(v => v).length;
    const percentage = (completedMeals / 5) * 100;
    
    document.getElementById('dayProgressValue').textContent = `${completedMeals}/5`;
    
    const circle = document.getElementById('dayProgressCircle');
    const circumference = 2 * Math.PI * 35;
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function updateOverallProgress() {
    let totalCompleted = 0;
    let daysCompleted = 0;
    
    for (let day = 1; day <= 15; day++) {
        const dayData = progressData[`day${day}`];
        const completed = Object.values(dayData).filter(v => v).length;
        totalCompleted += completed;
        if (completed === 5) daysCompleted++;
    }
    
    const totalMeals = 15 * 5;
    const percentage = Math.round((totalCompleted / totalMeals) * 100);
    
    document.getElementById('overallProgress').textContent = `${percentage}%`;
    document.getElementById('daysCompleted').textContent = daysCompleted;
    document.getElementById('mealsCompleted').textContent = `${totalCompleted}/${totalMeals}`;
    
    const circle = document.getElementById('overallProgressCircle');
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

async function updateProgress() {
    const progressRef = doc(db, 'progress', patientId);
    await updateDoc(progressRef, progressData);
}

function celebrateDayCompletion() {
    createConfetti(50);
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    playSuccessSound();
}

window.closeSuccessModal = function() {
    document.getElementById('successModal').style.display = 'none';
};

document.getElementById('closeDayDetails').addEventListener('click', () => {
    document.getElementById('dayDetails').style.display = 'none';
});

function showError() {
    document.getElementById('error').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// Iniciar
init();
