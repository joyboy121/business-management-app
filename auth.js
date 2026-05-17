import { auth } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
}
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// SIGNUP
window.signup = async function () {

  let email =
    document.getElementById("email").value;

  let password =
    document.getElementById("password").value;
     try {

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    alert("Account Created Successfully ✅");

  } catch (error) {

    alert(error.message);
     }
};

// LOGIN
window.login = async function () {

  let email =
    document.getElementById("email").value;

  let password =
    document.getElementById("password").value;

  try {
     await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    alert("Login Successful ✅");

    window.location.href =
      "dashboard.html";

  } catch (error) {

    alert(error.message);

  }
};
// Protect pages
onAuthStateChanged(auth, (user) => {

  const protectedPages = [
    "dashboard.html",
    "inventory.html",
    "billing.html",
    "ledger.html"
  ];

  let currentPage =
    window.location.pathname.split("/").pop();

  if (!user && protectedPages.includes(currentPage)) {

    window.location.href =
      "login.html";

  }
  });

// LOGOUT
window.logout = async function () {

  await signOut(auth);

  window.location.href =
    "login.html";
};