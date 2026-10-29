import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPNEPQrGwyYVbOb4Mxv0yudh_f7dUhgsQ",
  authDomain: "business-manager-1a1bb.firebaseapp.com",
  projectId: "business-manager-1a1bb",
  storageBucket: "business-manager-1a1bb.firebasestorage.app",
  messagingSenderId: "710251150123",
  appId: "1:710251150123:web:488c780a62b55d61a9636e",
  measurementId: "G-6TV0ENTW57"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const authPersistenceReady = setPersistence(auth, browserLocalPersistence)
  .catch(error => {
    console.error("Unable to enable local authentication persistence.", error);
  });

export { app, auth, authPersistenceReady, db, storage };
