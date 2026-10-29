import { db } from "./config/firebase.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const suppliersCollection = collection(db, "suppliers");

export function getSupplierOrdersCollection() { return collection(db, "purchaseOrders"); }

export function getSuppliersCollection() {
  return suppliersCollection;
}

export function createSupplier(data) {
  return addDoc(suppliersCollection, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateSupplier(supplierId, data) {
  return updateDoc(doc(db, "suppliers", supplierId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export function deleteSupplier(supplierId) {
  return deleteDoc(doc(db, "suppliers", supplierId));
}
