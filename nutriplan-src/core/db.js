// core/db.js — Firebase singleton + typed read/write helpers
// Single source of truth for all Firestore operations

import{initializeApp}from'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import{getFirestore,doc,getDoc,setDoc}from'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const _CFG={apiKey:'AIzaSyAB82hupqdQvlOfbM0xusNY5oPsEAHCcY4',
  authDomain:'portal-nutricional-693fb.firebaseapp.com',
  projectId:'portal-nutricional-693fb',
  storageBucket:'portal-nutricional-693fb.firebasestorage.app',
  messagingSenderId:'208066338229',
  appId:'1:208066338229:web:b4c16b54daa2aec9c24dfc'};

export const db  = getFirestore(initializeApp(_CFG));
export const pid = new URLSearchParams(location.search).get('id')
                || new URLSearchParams(location.search).get('pid');

// Debounced write — prevents excessive Firestore writes on rapid taps
const _pending = {};
export function writeSoon(collection, data, delay=600) {
  clearTimeout(_pending[collection]);
  _pending[collection] = setTimeout(async () => {
    try { await setDoc(doc(db, collection, pid), data, {merge:true}); }
    catch(e) { console.error('[db] write failed:', collection, e); }
  }, delay);
}

export async function readAll(pid_) {
  const [ps, pr, ls] = await Promise.all([
    getDoc(doc(db,'patients', pid_)),
    getDoc(doc(db,'progress', pid_)),
    getDoc(doc(db,'calcLogs', pid_)),
  ]);
  return {
    patient:  ps.exists()  ? ps.data()  : null,
    progress: pr.exists()  ? pr.data()  : {},
    logs:     ls.exists()  ? ls.data()  : {},
  };
}
