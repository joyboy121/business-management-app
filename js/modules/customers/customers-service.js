import { db } from "../../config/firebase.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const customersCollection = collection(db, "customers");
const invoicesCollection = collection(db, "invoices");
const ledgerCollection = collection(db, "ledger");

export function getCustomerCollections() {
  return {
    customers: customersCollection,
    invoices: invoicesCollection,
    ledger: ledgerCollection
  };
}

export function createCustomer(data) {
  return addDoc(customersCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateCustomer(customerId, data) {
  return updateDoc(doc(db, "customers", customerId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export function deleteCustomer(customerId) {
  return deleteDoc(doc(db, "customers", customerId));
}
