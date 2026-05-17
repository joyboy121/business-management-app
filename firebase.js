
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔴 Paste your real config here
const firebaseConfig = {
  apiKey:  "AIzaSyDPNEPQrGwyYVbOb4Mxv0yudh_f7dUhgsQ",
  authDomain: "business-manager-1a1bb.firebaseapp.com",
  projectId: "business-manager-1a1bb",
  storageBucket: "business-manager-1a1bb.firebasestorage.app",
  messagingSenderId: "710251150123",
  appId: "1:710251150123:web:488c780a62b55d61a9636e",
   measurementId: "G-6TV0ENTW57"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ THIS LINE WAS FAILING BEFORE
const db = getFirestore(app);

export const auth = getAuth(app);

// Export
export { db };
