// firebase.js — Shared Firebase config (admin panel)
// patient-view.html has its own embedded config for offline resilience

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const firebaseConfig = {
    apiKey:            "AIzaSyAB82hupqdQvlOfbM0xusNY5oPsEAHCcY4",
    authDomain:        "portal-nutricional-693fb.firebaseapp.com",
    projectId:         "portal-nutricional-693fb",
    storageBucket:     "portal-nutricional-693fb.firebasestorage.app",
    messagingSenderId: "208066338229",
    appId:             "1:208066338229:web:b4c16b54daa2aec9c24dfc"
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
