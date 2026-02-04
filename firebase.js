import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// TODO: Reemplaza esto con tu configuración de Firebase
// Ve a: https://console.firebase.google.com/
// 1. Crea un proyecto
// 2. Ve a Project Settings > General
// 3. En "Your apps" selecciona la opción Web (</>) 
// 4. Copia la configuración y pégala aquí

const firebaseConfig = {
  apiKey: "AIzaSyAB82hupqdQvlOfbM0xusNY5oPsEAHCcY4",
  authDomain: "portal-nutricional-693fb.firebaseapp.com",
  projectId: "portal-nutricional-693fb",
  storageBucket: "portal-nutricional-693fb.firebasestorage.app",
  messagingSenderId: "208066338229",
  appId: "1:208066338229:web:b4c16b54daa2aec9c24dfc",
  measurementId: "G-TFJCYE4PW4"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
