import { auth, authPersistenceReady } from "../config/firebase.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function registerUser(email, password) {
  await authPersistenceReady;
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInUser(email, password) {
  await authPersistenceReady;
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOutUser() {
  return signOut(auth);
}

export function observeAuthentication(callback) {
  return onAuthStateChanged(auth, callback);
}
