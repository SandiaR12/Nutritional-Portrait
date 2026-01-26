// firebase.js (Pega tu config aquí)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "REEMPLAZA_AQUI",
  authDomain: "REEMPLAZA_AQUI",
  projectId: "REEMPLAZA_AQUI",
  storageBucket: "REEMPLAZA_AQUI",
  messagingSenderId: "REEMPLAZA_AQUI",
  appId: "REEMPLAZA_AQUI",
  measurementId: "REEMPLAZA_AQUI"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
