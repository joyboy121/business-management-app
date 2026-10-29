import {
  observeAuthentication,
  registerUser,
  signInUser,
  signOutUser
} from "./services/auth-service.js";
import { setButtonLoading } from "./ui/loading.js";
import { showNotification } from "./ui/notifications.js";
import { requireEmail, requirePassword } from "./validation/input-validation.js";

const protectedPages = new Set([
  "dashboard.html",
  "inventory.html",
  "customers.html",
  "suppliers.html",
  "purchasing.html",
  "billing.html",
  "ledger.html",
  "warehouse.html",
  "reports.html",
  "settings.html",
  "search.html"
]);

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function getCredentials() {
  return {
    email: requireEmail(document.getElementById("email")?.value),
    password: requirePassword(document.getElementById("password")?.value)
  };
}

async function runAuthAction(action, selector, loadingLabel, successMessage) {
  const button = document.querySelector(selector);

  try {
    const { email, password } = getCredentials();
    setButtonLoading(button, true, loadingLabel);
    await action(email, password);
    showNotification(successMessage);
    return true;
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Authentication failed.", "error");
    return false;
  } finally {
    setButtonLoading(button, false);
  }
}

// Compatibility wrappers are retained while pages still use inline handlers.
window.signup = async function () {
  await runAuthAction(
    registerUser,
    "[data-auth-action='signup']",
    "Creating account…",
    "Account created successfully."
  );
};

window.login = async function () {
  const didSignIn = await runAuthAction(
    signInUser,
    "[data-auth-action='login']",
    "Signing in…",
    "Login successful."
  );

  if (didSignIn) {
    window.location.href = "dashboard.html";
  }
};

window.logout = async function () {
  const button = document.querySelector("[data-auth-action='logout']");

  try {
    setButtonLoading(button, true, "Signing out…");
    await signOutUser();
    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to sign out.", "error");
  } finally {
    setButtonLoading(button, false);
  }
};

observeAuthentication(user => {
  const currentPage = getCurrentPage();

  if (!user && protectedPages.has(currentPage)) {
    window.location.replace("index.html");
  }

  if (user && currentPage === "index.html") {
    window.location.replace("dashboard.html");
  }
});
