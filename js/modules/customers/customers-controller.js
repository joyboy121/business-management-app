import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { confirmAction } from "../../ui/dialog.js";
import { setButtonLoading } from "../../ui/loading.js";
import { showNotification } from "../../ui/notifications.js";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { requireEmail, requireText } from "../../validation/input-validation.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomerCollections,
  updateCustomer
} from "./customers-service.js";

const state = { customers: [], invoices: [], ledger: [] };
let selectedCustomerId = "";

function normalize(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function customerInvoices(customer) {
  const name = normalize(customer.name);
  return state.invoices.filter(invoice => normalize(invoice.customerName) === name);
}

function customerLedgerEntries(customer) {
  const name = normalize(customer.name);
  return state.ledger.filter(entry => normalize(entry.customer) === name);
}

function balanceFor(customer) {
  return customerLedgerEntries(customer).reduce((balance, entry) => {
    const amount = Number(entry.amount) || 0;
    return entry.type === "credit" ? balance + amount : balance - amount;
  }, 0);
}

function invoiceTotalFor(customer) {
  return customerInvoices(customer).reduce((total, invoice) => total + (Number(invoice.grandTotal) || 0), 0);
}

function createButton(label, action, recordId, variant = "primary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `erp-button erp-button--${variant}`;
  button.dataset.action = action;
  button.dataset.recordId = recordId;
  button.textContent = label;
  return button;
}

function renderSummary() {
  const invoiceTotal = state.customers.reduce((total, customer) => total + invoiceTotalFor(customer), 0);
  const outstanding = state.customers.reduce((total, customer) => total + balanceFor(customer), 0);
  document.getElementById("customersCount").textContent = String(state.customers.length);
  document.getElementById("customersInvoiceTotal").textContent = formatCurrency(invoiceTotal);
  document.getElementById("customersOutstandingTotal").textContent = formatCurrency(outstanding);
}

function filteredCustomers() {
  const query = normalize(document.getElementById("customersSearch")?.value);
  return [...state.customers]
    .filter(customer => [customer.name, customer.phone, customer.email].some(value => normalize(value).includes(query)))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function renderCustomers() {
  const body = document.getElementById("customersTableBody");
  const empty = document.getElementById("customersEmptyState");
  const count = document.getElementById("customersListCount");
  if (!body || !empty || !count) return;

  const customers = filteredCustomers();
  body.replaceChildren();
  count.textContent = `${customers.length} of ${state.customers.length} customers`;
  empty.hidden = customers.length > 0;
  empty.textContent = state.customers.length ? "No customers match your search." : "No customers yet. Add your first customer above.";

  customers.forEach(customer => {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    const nameStrong = document.createElement("strong");
    nameStrong.textContent = customer.name;
    const note = document.createElement("small");
    note.textContent = customer.notes || "No notes";
    name.append(nameStrong, note);

    const contact = document.createElement("td");
    contact.textContent = [customer.phone, customer.email].filter(Boolean).join(" · ") || "—";
    const invoices = document.createElement("td");
    invoices.textContent = `${customerInvoices(customer).length} · ${formatCurrency(invoiceTotalFor(customer))}`;
    const balance = document.createElement("td");
    balance.textContent = formatCurrency(balanceFor(customer));
    const actions = document.createElement("td");
    const actionGroup = document.createElement("div");
    actionGroup.className = "customers-actions";
    actionGroup.append(
      createButton("View", "customers-view", customer.id),
      createButton("Edit", "customers-edit", customer.id),
      createButton("Delete", "customers-delete", customer.id, "danger")
    );
    actions.appendChild(actionGroup);
    row.append(name, contact, invoices, balance, actions);
    body.appendChild(row);
  });
}

function renderProfile() {
  const profile = document.getElementById("customerProfile");
  if (!profile) return;
  const customer = state.customers.find(item => item.id === selectedCustomerId);
  profile.hidden = !customer;
  if (!customer) return;

  const invoices = customerInvoices(customer);
  document.getElementById("customerProfileName").textContent = customer.name;
  document.getElementById("customerProfileContact").textContent = [customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details";
  document.getElementById("customerProfileAddress").textContent = customer.address || "No address recorded";
  document.getElementById("customerProfileNotes").textContent = customer.notes || "No notes recorded";
  document.getElementById("customerProfileInvoices").textContent = String(invoices.length);
  document.getElementById("customerProfileInvoiceValue").textContent = formatCurrency(invoiceTotalFor(customer));
  document.getElementById("customerProfileBalance").textContent = formatCurrency(balanceFor(customer));

  const history = document.getElementById("customerProfileInvoiceHistory");
  history.replaceChildren();
  if (!invoices.length) {
    const empty = document.createElement("p");
    empty.className = "customers-empty-state";
    empty.textContent = "No matching invoices found. Existing Billing invoices are matched by customer name.";
    history.appendChild(empty);
    return;
  }

  invoices.sort((first, second) => (second.date?.seconds || 0) - (first.date?.seconds || 0)).forEach(invoice => {
    const item = document.createElement("article");
    item.className = "customers-invoice-item";
    item.textContent = `${formatDate(invoice.date)} · ${formatCurrency(invoice.grandTotal)} · ${(invoice.items || []).length} items`;
    history.appendChild(item);
  });
}

function render() {
  renderSummary();
  renderCustomers();
  renderProfile();
}

function customerDataFromInputs() {
  const name = requireText(document.getElementById("customerName").value, "Customer name");
  const phone = requireText(document.getElementById("customerPhone").value, "Phone");
  const emailInput = document.getElementById("customerEmail").value.trim();
  return {
    name,
    normalizedName: normalize(name),
    phone,
    email: emailInput ? requireEmail(emailInput) : "",
    address: document.getElementById("customerAddress").value.trim(),
    notes: document.getElementById("customerNotes").value.trim()
  };
}

function duplicateCustomer(name, phone, excludeId = "") {
  return state.customers.some(customer => customer.id !== excludeId && (
    normalize(customer.name) === normalize(name) || normalize(customer.phone) === normalize(phone)
  ));
}

async function handleCreate(event) {
  const button = event.currentTarget;
  try {
    const data = customerDataFromInputs();
    if (duplicateCustomer(data.name, data.phone)) throw new Error("A customer with this name or phone already exists.");
    setButtonLoading(button, true, "Adding...");
    await createCustomer(data);
    ["customerName", "customerPhone", "customerEmail", "customerAddress", "customerNotes"].forEach(id => { document.getElementById(id).value = ""; });
    showNotification("Customer added successfully.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to add customer.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

function openCustomerEditor(customer) {
  const overlay = document.createElement("div");
  overlay.className = "erp-dialog-overlay";
  const dialog = document.createElement("form");
  dialog.className = "erp-dialog customers-edit-dialog";
  const heading = document.createElement("h2");
  heading.textContent = "Edit Customer";
  dialog.appendChild(heading);

  const fields = [
    ["name", "Full name", "text", customer.name],
    ["phone", "Phone", "tel", customer.phone],
    ["email", "Email", "email", customer.email],
    ["address", "Address", "text", customer.address],
    ["notes", "Notes", "text", customer.notes]
  ];
  fields.forEach(([id, labelText, type, value]) => {
    const field = document.createElement("div");
    field.className = "form-field";
    const label = document.createElement("label");
    label.htmlFor = `customer-edit-${id}`;
    label.textContent = labelText;
    const input = document.createElement(id === "address" || id === "notes" ? "textarea" : "input");
    input.id = `customer-edit-${id}`;
    input.name = id;
    input.value = value || "";
    if (input.tagName === "INPUT") input.type = type;
    if (id === "name" || id === "phone") input.required = true;
    field.append(label, input);
    dialog.appendChild(field);
  });

  const actions = document.createElement("div");
  actions.className = "erp-dialog-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "erp-button erp-button--secondary";
  cancel.textContent = "Cancel";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "erp-button erp-button--primary";
  save.textContent = "Save";
  actions.append(cancel, save);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  cancel.addEventListener("click", close);
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  dialog.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(dialog));
      const data = {
        name: requireText(values.name, "Customer name"),
        phone: requireText(values.phone, "Phone"),
        email: values.email.trim() ? requireEmail(values.email) : "",
        address: values.address.trim(),
        notes: values.notes.trim()
      };
      data.normalizedName = normalize(data.name);
      if (duplicateCustomer(data.name, data.phone, customer.id)) throw new Error("A customer with this name or phone already exists.");
      setButtonLoading(save, true, "Saving...");
      await updateCustomer(customer.id, data);
      close();
      showNotification("Customer updated successfully.");
    } catch (error) {
      console.error(error);
      showNotification(error.message || "Unable to update customer.", "error");
    } finally {
      setButtonLoading(save, false);
    }
  });
  dialog.querySelector("input")?.focus();
}

async function handleAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const customer = state.customers.find(item => item.id === button.dataset.recordId);
  if (!customer) return;

  try {
    if (button.dataset.action === "customers-view") {
      selectedCustomerId = customer.id;
      renderProfile();
      document.getElementById("customerProfile")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (button.dataset.action === "customers-edit") {
      openCustomerEditor(customer);
      return;
    }
    if (button.dataset.action === "customers-delete") {
      if (customerInvoices(customer).length || customerLedgerEntries(customer).length) {
        throw new Error("Customers with invoice or ledger history cannot be deleted.");
      }
      if (!await confirmAction({ title: "Delete customer?", message: "This customer profile will be permanently removed.", confirmLabel: "Delete", danger: true })) return;
      setButtonLoading(button, true, "Deleting...");
      await deleteCustomer(customer.id);
      if (selectedCustomerId === customer.id) selectedCustomerId = "";
      showNotification("Customer deleted successfully.");
    }
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to update customer.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

function subscribe() {
  const collections = getCustomerCollections();
  const subscribeTo = (reference, key) => onSnapshot(reference, snapshot => {
    state[key] = snapshot.docs.map(documentSnapshot => ({ id: documentSnapshot.id, ...documentSnapshot.data() }));
    render();
  }, error => {
    console.error(error);
    showNotification("Unable to refresh customer data.", "error");
  });
  return [subscribeTo(collections.customers, "customers"), subscribeTo(collections.invoices, "invoices"), subscribeTo(collections.ledger, "ledger")];
}

export function initializeCustomers() {
  const table = document.getElementById("customersTableBody");
  if (!table) return;
  document.querySelector("[data-action='customers-add']")?.addEventListener("click", handleCreate);
  document.getElementById("customersSearch")?.addEventListener("input", renderCustomers);
  table.addEventListener("click", handleAction);
  document.querySelector("[data-action='customers-close-profile']")?.addEventListener("click", () => { selectedCustomerId = ""; renderProfile(); });
  subscribe();
}
