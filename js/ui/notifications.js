const TOAST_REGION_ID = "erp-toast-region";

function getToastRegion() {
  let region = document.getElementById(TOAST_REGION_ID);

  if (!region) {
    region = document.createElement("div");
    region.id = TOAST_REGION_ID;
    region.className = "erp-toast-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
  }

  return region;
}

export function showNotification(message, type = "success", duration = 4000) {
  const toast = document.createElement("div");
  toast.className = `erp-toast erp-toast--${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;

  getToastRegion().appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
}
