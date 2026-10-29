import { db } from "../config/firebase.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function getCollectionReference(collectionName) {
  return collection(db, collectionName);
}

export function getDocumentReference(collectionName, documentId) {
  return doc(db, collectionName, documentId);
}

export function createRecord(collectionName, data) {
  return addDoc(getCollectionReference(collectionName), data);
}

export function getRecords(collectionName) {
  return getDocs(getCollectionReference(collectionName));
}

export function updateRecord(collectionName, documentId, data) {
  return updateDoc(getDocumentReference(collectionName, documentId), data);
}

export function deleteRecord(collectionName, documentId) {
  return deleteDoc(getDocumentReference(collectionName, documentId));
}

export function subscribeToCollection(collectionName, onData, onError) {
  return onSnapshot(getCollectionReference(collectionName), onData, onError);
}
