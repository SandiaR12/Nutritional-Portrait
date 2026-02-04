import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// TODO: Reemplaza esto con tu configuración de Firebase
// Ve a: https://console.firebase.google.com/
// 1. Crea un proyecto
// 2. Ve a Project Settings > General
// 3. En "Your apps" selecciona la opción Web (</>) 
// 4. Copia la configuración y pégala aquí

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
