export function confirmAction({
  title = "Confirm action",
  message,
  confirmLabel = "Confirm",
  danger = false
}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "erp-dialog-overlay";

    const dialog = document.createElement("section");
    dialog.className = "erp-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "erp-dialog-title");

    const heading = document.createElement("h2");
    heading.id = "erp-dialog-title";
    heading.textContent = title;

    const body = document.createElement("p");
    body.textContent = message;

    const actions = document.createElement("div");
    actions.className = "erp-dialog-actions";

    const cancelButton = document.createElement("button");
    cancelButton.className = "erp-button erp-button--secondary";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";

    const confirmButton = document.createElement("button");
    confirmButton.className = `erp-button ${
      danger ? "erp-button--danger" : "erp-button--primary"
    }`;
    confirmButton.type = "button";
    confirmButton.textContent = confirmLabel;

    const close = result => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(result);
    };

    const onKeyDown = event => {
      if (event.key === "Escape") close(false);
    };

    cancelButton.addEventListener("click", () => close(false));
    confirmButton.addEventListener("click", () => close(true));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(false);
    });

    actions.append(cancelButton, confirmButton);
    dialog.append(heading, body, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKeyDown);
    confirmButton.focus();
  });
}
