export function setButtonLoading(button, isLoading, loadingLabel = "Working…") {
  if (!button) return;

  if (isLoading) {
    button.dataset.label = button.textContent.trim();
    button.disabled = true;
    button.classList.add("is-loading");
    button.textContent = loadingLabel;
    return;
  }

  button.disabled = false;
  button.classList.remove("is-loading");
  button.textContent = button.dataset.label || button.textContent;
}
