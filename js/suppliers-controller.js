import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { confirmAction } from "./ui/dialog.js";
import { setButtonLoading } from "./ui/loading.js";
import { showNotification } from "./ui/notifications.js";
import { formatCurrency } from "./utils/formatters.js";
import { requireEmail, requireText } from "./validation/input-validation.js";
import {
  createSupplier,
  deleteSupplier,
  getSuppliersCollection,
  updateSupplier,
  getSupplierOrdersCollection
} from "./suppliers-service.js";

const state = { suppliers: [], orders: [] };
let selectedSupplierId = "";

const normalize = value => String(value || "").trim().toLocaleLowerCase();

function getSupplierData(values) {
  const name = requireText(values.name, "Supplier name");
  const phone = requireText(values.phone, "Phone");
  const email = String(values.email || "").trim();

  return {
    name,
    normalizedName: normalize(name),
    phone,
    email: email ? requireEmail(email) : "",
    address: String(values.address || "").trim(),
    notes: String(values.notes || "").trim()
  };
}

function hasDuplicate(data, excludeId = "") {
  return state.suppliers.some(supplier => supplier.id !== excludeId && (
    normalize(supplier.name) === data.normalizedName ||
    normalize(supplier.phone) === normalize(data.phone)
  ));
}

function makeButton(label, action, id, variant = "primary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `erp-button erp-button--${variant}`;
  button.dataset.action = action;
  button.dataset.recordId = id;
  button.textContent = label;
  return button;
}

function renderSummary() {
  document.getElementById("suppliersCount").textContent = String(state.suppliers.length);
  document.getElementById("suppliersEmailCount").textContent = String(state.suppliers.filter(item => item.email).length);
  document.getElementById("suppliersPurchaseCount").textContent = String(state.orders.length);
}

function filteredSuppliers() {
  const query = normalize(document.getElementById("suppliersSearch")?.value);
  return [...state.suppliers]
    .filter(supplier => [supplier.name, supplier.phone, supplier.email].some(value => normalize(value).includes(query)))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function renderTable() {
  const body = document.getElementById("suppliersTableBody");
  const empty = document.getElementById("suppliersEmptyState");
  const count = document.getElementById("suppliersListCount");
  const suppliers = filteredSuppliers();
  body.replaceChildren();
  count.textContent = `${suppliers.length} of ${state.suppliers.length} suppliers`;
  empty.hidden = suppliers.length > 0;
  empty.textContent = state.suppliers.length ? "No suppliers match your search." : "No suppliers yet. Add your first supplier above.";

  suppliers.forEach(supplier => {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    const heading = document.createElement("strong");
    heading.textContent = supplier.name;
    const note = document.createElement("small");
    note.textContent = supplier.notes || "No notes";
    name.append(heading, note);
    const contact = document.createElement("td");
    contact.textContent = [supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—";
    const address = document.createElement("td");
    address.textContent = supplier.address || "—";
    const actions = document.createElement("td");
    const group = document.createElement("div");
    group.className = "suppliers-actions";
    group.append(
      makeButton("View", "suppliers-view", supplier.id),
      makeButton("Edit", "suppliers-edit", supplier.id),
      makeButton("Delete", "suppliers-delete", supplier.id, "danger")
    );
    actions.appendChild(group);
    row.append(name, contact, address, actions);
    body.appendChild(row);
  });
}

function renderProfile() {
  const profile = document.getElementById("supplierProfile");
  const supplier = state.suppliers.find(item => item.id === selectedSupplierId);
  profile.hidden = !supplier;
  if (!supplier) return;
  document.getElementById("supplierProfileName").textContent = supplier.name;
  document.getElementById("supplierProfileContact").textContent = [supplier.phone, supplier.email].filter(Boolean).join(" · ") || "No contact details";
  document.getElementById("supplierProfileAddress").textContent = supplier.address || "No address recorded";
  document.getElementById("supplierProfileNotes").textContent = supplier.notes || "No notes recorded";
  const body = document.getElementById("supplierPurchaseHistory");
  const empty = document.getElementById("supplierPurchaseEmpty");
  const orders = state.orders.filter(item => item.supplierId === supplier.id);
  body.replaceChildren();
  empty.hidden = orders.length > 0;
  empty.textContent = orders.length ? "" : "No purchase orders for this supplier yet.";
  orders
    .sort((first, second) =>
      (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0)
    )
    .forEach(order => {
    const row = document.createElement("tr");
      [
        order.orderNumber || "Purchase order",
        order.productName || "Product",
        String(order.quantity || 0),
        formatCurrency(order.totalCost),
        order.status || "pending"
      ].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
    body.appendChild(row);
  });
}

function render() {
  renderSummary();
  renderTable();
  renderProfile();
}

function openEditor(supplier) {
  const overlay = document.createElement("div");
  overlay.className = "erp-dialog-overlay";
  const form = document.createElement("form");
  form.className = "erp-dialog suppliers-edit-dialog";
  const title = document.createElement("h2");
  title.textContent = supplier ? "Edit Supplier" : "Add Supplier";
  form.appendChild(title);
  const fields = [["name", "Supplier name"], ["phone", "Phone"], ["email", "Email"], ["address", "Address"], ["notes", "Notes"]];
  fields.forEach(([key, labelText]) => {
    const field = document.createElement("div"); field.className = "form-field";
    const label = document.createElement("label"); label.htmlFor = `supplier-${key}`; label.textContent = labelText;
    const input = document.createElement(key === "address" || key === "notes" ? "textarea" : "input");
    input.id = `supplier-${key}`; input.name = key; input.value = supplier?.[key] || "";
    if (input.tagName === "INPUT") input.type = key === "email" ? "email" : key === "phone" ? "tel" : "text";
    if (key === "name" || key === "phone") input.required = true;
    field.append(label, input); form.appendChild(field);
  });
  const actions = document.createElement("div"); actions.className = "erp-dialog-actions";
  const cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "erp-button erp-button--secondary"; cancel.textContent = "Cancel";
  const save = document.createElement("button"); save.type = "submit"; save.className = "erp-button erp-button--primary"; save.textContent = "Save";
  actions.append(cancel, save); form.appendChild(actions); overlay.appendChild(form); document.body.appendChild(overlay);
  const close = () => overlay.remove();
  cancel.addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const data = getSupplierData(Object.fromEntries(new FormData(form)));
      if (hasDuplicate(data, supplier?.id)) throw new Error("A supplier with this name or phone already exists.");
      setButtonLoading(save, true, "Saving...");
      if (supplier) await updateSupplier(supplier.id, data); else await createSupplier(data);
      close(); showNotification(`Supplier ${supplier ? "updated" : "added"} successfully.`);
    } catch (error) { console.error(error); showNotification(error.message || "Unable to save supplier.", "error"); }
    finally { setButtonLoading(save, false); }
  });
  form.querySelector("input")?.focus();
}

async function handleCreate(event) {
  const button = event.currentTarget;
  try {
    const data = getSupplierData({
      name: document.getElementById("supplierName").value,
      phone: document.getElementById("supplierPhone").value,
      email: document.getElementById("supplierEmail").value,
      address: document.getElementById("supplierAddress").value,
      notes: document.getElementById("supplierNotes").value
    });
    if (hasDuplicate(data)) throw new Error("A supplier with this name or phone already exists.");
    setButtonLoading(button, true, "Adding...");
    await createSupplier(data);
    ["supplierName", "supplierPhone", "supplierEmail", "supplierAddress", "supplierNotes"].forEach(id => { document.getElementById(id).value = ""; });
    showNotification("Supplier added successfully.");
  } catch (error) { console.error(error); showNotification(error.message || "Unable to add supplier.", "error"); }
  finally { setButtonLoading(button, false); }
}

async function handleAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const supplier = state.suppliers.find(item => item.id === button.dataset.recordId);
  if (!supplier) return;
  if (button.dataset.action === "suppliers-view") {
    selectedSupplierId = supplier.id; renderProfile(); document.getElementById("supplierProfile")?.scrollIntoView({ behavior: "smooth", block: "start" }); return;
  }
  if (button.dataset.action === "suppliers-edit") { openEditor(supplier); return; }
  if (button.dataset.action !== "suppliers-delete") return;
  if (!await confirmAction({ title: "Delete supplier?", message: "This supplier profile will be permanently removed.", confirmLabel: "Delete", danger: true })) return;
  try {
    setButtonLoading(button, true, "Deleting...");
    await deleteSupplier(supplier.id);
    if (selectedSupplierId === supplier.id) selectedSupplierId = "";
    showNotification("Supplier deleted successfully.");
  } catch (error) { console.error(error); showNotification(error.message || "Unable to delete supplier.", "error"); }
  finally { setButtonLoading(button, false); }
}

export function initializeSuppliers() {
  const table = document.getElementById("suppliersTableBody");
  if (!table) return;
  document.querySelector("[data-action='suppliers-add']")?.addEventListener("click", handleCreate);
  document.getElementById("suppliersSearch")?.addEventListener("input", renderTable);
  table.addEventListener("click", handleAction);
  document.querySelector("[data-action='suppliers-close-profile']")?.addEventListener("click", () => { selectedSupplierId = ""; renderProfile(); });
  onSnapshot(getSuppliersCollection(), snapshot => {
    state.suppliers = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    render();
  }, error => { console.error(error); showNotification("Unable to refresh supplier data.", "error"); });
  onSnapshot(getSupplierOrdersCollection(), snapshot => {
    state.orders = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    render();
  }, error => { console.error(error); showNotification("Unable to refresh supplier purchase history.", "error"); });
}
