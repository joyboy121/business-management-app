import { db } from "./config/firebase.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showNotification } from "./ui/notifications.js";

const settingsReference = doc(db, "settings", "businessProfile");
const settingsForm = document.getElementById("settingsForm");
const saveButton = settingsForm.querySelector("button[type=submit]");

function cacheSettings(settings) {
  localStorage.setItem("erp-business-settings", JSON.stringify(settings));
}

async function loadSettings() {
  try {
    const snapshot = await getDoc(settingsReference);
    if (!snapshot.exists()) return;

    const settings = snapshot.data();
    cacheSettings(settings);
    Object.entries(settings).forEach(([name, value]) => {
      const field = settingsForm.elements[name];
      if (field && typeof value !== "object") field.value = value;
    });
  } catch (error) {
    console.error(error);
    showNotification("Unable to load business settings.", "error");
  }
}

settingsForm.addEventListener("submit", async event => {
  event.preventDefault();
  const formData = new FormData(settingsForm);
  const settings = Object.fromEntries(formData);
  settings.businessName = settings.businessName.trim();
  settings.currency = settings.currency.trim();
  settings.invoicePrefix = settings.invoicePrefix.trim() || "INV";
  settings.taxRate = Math.max(0, Number(settings.taxRate) || 0);

  if (!settings.businessName || !settings.currency) {
    showNotification("Enter a business name and currency symbol.", "error");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  try {
    await setDoc(settingsReference, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
    cacheSettings(settings);
    showNotification("Business settings saved.");
  } catch (error) {
    console.error(error);
    showNotification("Unable to save settings.", "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save settings";
  }
});

loadSettings();
