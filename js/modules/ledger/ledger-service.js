import { db } from "../../config/firebase.js";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const ledger = collection(db, "ledger");
export function getLedgerCollections() { return { customers: collection(db, "customers"), ledger }; }
export function createLedgerEntry(data) { return addDoc(ledger, { ...data, createdAt: serverTimestamp(), date: serverTimestamp(), updatedAt: serverTimestamp() }); }
export function updateLedgerEntry(id, data) { return updateDoc(doc(db, "ledger", id), { ...data, updatedAt: serverTimestamp() }); }
export function deleteLedgerEntry(id) { return deleteDoc(doc(db, "ledger", id)); }
