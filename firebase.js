// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCcA1fbapUdDbgrgn5sl9vBxX_XfKQmys",
  authDomain: "portalnutricionals.firebaseapp.com",
  projectId: "portalnutricionals",
  storageBucket: "portalnutricionals.firebasestorage.app",
  messagingSenderId: "1085909222208",
  appId: "1:1085909222208:web:6650c8cf248fc5754fb0a5",
  measurementId: "G-CMP8WBR4LE"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
