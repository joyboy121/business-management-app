import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { confirmAction } from "./ui/dialog.js";
import { setButtonLoading } from "./ui/loading.js";
import { showNotification } from "./ui/notifications.js";
import { formatCurrency, formatDate } from "./utils/formatters.js";
import { requirePositiveNumber } from "./validation/number-validation.js";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchasingCollections,
  receivePurchaseOrder
} from "./purchasing-service.js";

const state = {
  orders: [],
  products: [],
  suppliers: []
};

function addOptions(select, records, placeholder, selectedValue) {
  select.replaceChildren();
  const firstOption = new Option(placeholder, "");
  firstOption.disabled = true;
  select.add(firstOption);

  records
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name))
    .forEach(record => select.add(new Option(record.name, record.id)));

  select.value = records.some(record => record.id === selectedValue)
    ? selectedValue
    : "";
}

function renderSelectors() {
  const supplierSelect = document.getElementById("purchaseSupplier");
  const productSelect = document.getElementById("purchaseProduct");

  addOptions(
    supplierSelect,
    state.suppliers,
    "Choose a supplier",
    supplierSelect.value
  );
  addOptions(
    productSelect,
    state.products,
    "Choose a product",
    productSelect.value
  );
}

function getVisibleOrders() {
  const query = document.getElementById("purchaseSearch").value
    .trim()
    .toLocaleLowerCase();
  const status = document.getElementById("purchaseStatusFilter").value;

  return state.orders
    .filter(order => {
      const matchesStatus = status === "all" || order.status === status;
      const searchableValues = [
        order.orderNumber,
        order.supplierName,
        order.productName
      ];
      const matchesQuery = searchableValues.some(value =>
        String(value || "").toLocaleLowerCase().includes(query)
      );
      return matchesStatus && matchesQuery;
    })
    .sort((first, second) =>
      (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0)
    );
}

function renderSummary() {
  const pendingOrders = state.orders.filter(order => order.status === "pending");
  const receivedCount = state.orders.filter(order => order.status === "received").length;
  const pendingValue = pendingOrders.reduce(
    (total, order) => total + (Number(order.totalCost) || 0),
    0
  );

  document.getElementById("purchasePendingCount").textContent =
    String(pendingOrders.length);
  document.getElementById("purchaseReceivedCount").textContent =
    String(receivedCount);
  document.getElementById("purchasePendingValue").textContent =
    formatCurrency(pendingValue);
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function createActionButton(label, action, orderId, variant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "erp-button erp-button--" + variant;
  button.dataset.action = action;
  button.dataset.recordId = orderId;
  button.textContent = label;
  return button;
}

function renderOrders() {
  const tableBody = document.getElementById("purchaseOrderTable");
  const emptyState = document.getElementById("purchaseEmptyState");
  const orders = getVisibleOrders();

  tableBody.replaceChildren();
  document.getElementById("purchaseOrderCount").textContent =
    orders.length + " of " + state.orders.length + " orders";
  emptyState.hidden = orders.length > 0;
  emptyState.textContent = state.orders.length
    ? "No purchase orders match these filters."
    : "No purchase orders yet. Create an order to get started.";

  orders.forEach(order => {
    const row = document.createElement("tr");
    const date = order.createdAt?.toDate?.();
    const supplierLabel = (order.supplierName || "Unknown supplier")
      + "\n"
      + formatDate(date);

    row.append(
      createCell(order.orderNumber || "Legacy order"),
      createCell(supplierLabel),
      createCell(order.productName || "Product"),
      createCell(String(order.quantity ?? "")),
      createCell(formatCurrency(order.totalCost))
    );

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = "phase-status-pill phase-status-pill--"
      + (order.status || "pending");
    status.textContent = order.status || "pending";
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    const actions = document.createElement("td");
    if (order.status === "pending") {
      actions.append(
        createActionButton("Receive", "purchasing-receive", order.id, "primary"),
        createActionButton("Cancel", "purchasing-cancel", order.id, "danger")
      );
    } else {
      actions.textContent = "—";
    }
    row.appendChild(actions);
    tableBody.appendChild(row);
  });
}

function render() {
  renderSelectors();
  renderSummary();
  renderOrders();
}

async function createOrder(event) {
  const button = event.currentTarget;

  try {
    const supplierId = document.getElementById("purchaseSupplier").value;
    const productId = document.getElementById("purchaseProduct").value;
    const supplier = state.suppliers.find(record => record.id === supplierId);
    const product = state.products.find(record => record.id === productId);

    if (!supplier) throw new Error("Choose a supplier.");
    if (!product) throw new Error("Choose a product.");

    const quantity = requirePositiveNumber(
      document.getElementById("purchaseQuantity").value,
      "Quantity",
      { integer: true }
    );
    const unitCost = requirePositiveNumber(
      document.getElementById("purchaseCost").value,
      "Unit cost"
    );

    setButtonLoading(button, true, "Creating…");
    await createPurchaseOrder({
      orderNumber: "PO-" + Date.now(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: product.id,
      productName: product.name,
      quantity,
      unitCost,
      totalCost: quantity * unitCost
    });

    document.getElementById("purchaseQuantity").value = "";
    document.getElementById("purchaseCost").value = "";
    showNotification("Purchase order created.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to create purchase order.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleOrderAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const isReceive = button.dataset.action === "purchasing-receive";
  const isCancel = button.dataset.action === "purchasing-cancel";
  if (!isReceive && !isCancel) return;

  const confirmed = await confirmAction({
    title: isReceive ? "Receive this order?" : "Cancel this order?",
    message: isReceive
      ? "The ordered quantity will be added to Main Warehouse stock."
      : "This pending purchase order will be cancelled.",
    confirmLabel: isReceive ? "Receive stock" : "Cancel order",
    danger: isCancel
  });
  if (!confirmed) return;

  try {
    setButtonLoading(button, true, isReceive ? "Receiving…" : "Cancelling…");
    if (isReceive) {
      await receivePurchaseOrder(button.dataset.recordId);
    } else {
      await cancelPurchaseOrder(button.dataset.recordId);
    }
    showNotification(isReceive
      ? "Stock received and movement recorded."
      : "Purchase order cancelled.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to update purchase order.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

function subscribe() {
  const collections = getPurchasingCollections();
  const subscribeTo = (reference, key) => onSnapshot(
    reference,
    snapshot => {
      state[key] = snapshot.docs.map(record => ({
        id: record.id,
        ...record.data()
      }));
      render();
    },
    error => {
      console.error(error);
      showNotification("Unable to refresh purchasing data.", "error");
    }
  );

  subscribeTo(collections.suppliers, "suppliers");
  subscribeTo(collections.products, "products");
  subscribeTo(collections.orders, "orders");
}

export function initializePurchasing() {
  const table = document.getElementById("purchaseOrderTable");
  if (!table) return;

  document.querySelector("[data-action=purchasing-create]")
    ?.addEventListener("click", createOrder);
  table.addEventListener("click", handleOrderAction);

  ["purchaseSearch", "purchaseStatusFilter"].forEach(id => {
    const control = document.getElementById(id);
    control?.addEventListener("input", renderOrders);
    control?.addEventListener("change", renderOrders);
  });

  subscribe();
}
