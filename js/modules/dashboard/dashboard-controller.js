import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { confirmAction } from "../../ui/dialog.js";
import { setButtonLoading } from "../../ui/loading.js";
import { showNotification } from "../../ui/notifications.js";
import { formatCurrency, formatDate } from "../../utils/formatters.js";
import { requirePositiveNumber } from "../../validation/number-validation.js";
import {
  createExpense,
  createSale,
  getDashboardCollections,
  removeExpense,
  removeSale
} from "./dashboard-service.js";

const dashboardState = {
  expenses: [],
  inventory: [],
  sales: []
};

let pieChartInstance = null;
let lineChartInstance = null;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRecordDate(record) {
  return toDate(record.createdAt) || toDate(record.date);
}

function sortByNewest(records) {
  return [...records].sort((first, second) => {
    const secondTime = getRecordDate(second)?.getTime() || 0;
    const firstTime = getRecordDate(first)?.getTime() || 0;
    return secondTime - firstTime;
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function createEmptyState(message) {
  const emptyState = document.createElement("p");
  emptyState.className = "dashboard-empty-state";
  emptyState.textContent = message;
  return emptyState;
}

function renderLoadingState(container) {
  container.replaceChildren();

  for (let index = 0; index < 3; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "dashboard-skeleton";
    container.appendChild(skeleton);
  }
}

function createHistoryEntry(record, recordType) {
  const entry = document.createElement("article");
  entry.className = "history-entry";

  const details = document.createElement("div");
  const amount = document.createElement("strong");
  amount.textContent = formatCurrency(record.amount);

  const meta = document.createElement("p");
  meta.className = "dashboard-history-meta";

  if (recordType === "sale" && record.saleType === "product") {
    meta.textContent = `${record.productName || "Product sale"} · Qty ${record.quantity}`;
  } else if (recordType === "sale" && record.saleType === "manual") {
    meta.textContent = "Manual sale";
  } else {
    meta.textContent = "Expense";
  }

  const date = document.createElement("p");
  date.className = "dashboard-history-meta";
  date.textContent = formatDate(getRecordDate(record));

  details.append(amount, meta, date);

  const deleteButton = document.createElement("button");
  deleteButton.className = "erp-button erp-button--danger";
  deleteButton.type = "button";
  deleteButton.dataset.action = `delete-${recordType}`;
  deleteButton.dataset.recordId = record.id;
  deleteButton.textContent = "Delete";

  entry.append(details, deleteButton);
  return entry;
}

function renderHistory(containerId, records, recordType, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();

  if (!records.length) {
    container.appendChild(createEmptyState(emptyMessage));
    return;
  }

  sortByNewest(records).forEach(record => {
    container.appendChild(createHistoryEntry(record, recordType));
  });
}

function renderProducts() {
  const select = document.getElementById("saleProduct");
  if (!select) return;

  const selectedProductId = select.value;
  select.replaceChildren();

  const availableProducts = dashboardState.inventory
    .filter(product => Number(product.stock) > 0)
    .sort((first, second) => String(first.name).localeCompare(String(second.name)));

  if (!availableProducts.length) {
    const option = new Option("No products in stock", "");
    option.disabled = true;
    option.selected = true;
    select.add(option);
    return;
  }

  const placeholder = new Option("Select a product", "");
  placeholder.disabled = true;
  placeholder.selected = !selectedProductId;
  select.add(placeholder);

  availableProducts.forEach(product => {
    const option = new Option(
      `${product.name} (Stock: ${product.stock})`,
      product.id
    );
    option.dataset.price = String(product.price ?? "");
    option.dataset.stock = String(product.stock ?? "");
    select.add(option);
  });

  if (availableProducts.some(product => product.id === selectedProductId)) {
    select.value = selectedProductId;
  }
}

function buildTimeline(records) {
  const amountsByDay = new Map();

  records.forEach(record => {
    const date = getRecordDate(record);
    if (!date) return;

    const key = date.toISOString().slice(0, 10);
    amountsByDay.set(key, (amountsByDay.get(key) || 0) + Number(record.amount || 0));
  });

  return [...amountsByDay.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-14);
}

function renderCharts(totalSales, totalExpenses) {
  if (!window.Chart) return;

  const pieCanvas = document.getElementById("pieChart");
  const lineCanvas = document.getElementById("lineChart");
  if (!pieCanvas || !lineCanvas) return;

  pieChartInstance?.destroy();
  lineChartInstance?.destroy();

  pieChartInstance = new Chart(pieCanvas, {
    type: "doughnut",
    data: {
      labels: ["Sales", "Expenses"],
      datasets: [{
        data: [totalSales, totalExpenses],
        backgroundColor: ["#2563eb", "#dc2626"]
      }]
    },
    options: {
      plugins: { legend: { position: "bottom" } }
    }
  });

  const timeline = buildTimeline(dashboardState.sales);
  lineChartInstance = new Chart(lineCanvas, {
    type: "line",
    data: {
      labels: timeline.map(([date]) => formatDate(date)),
      datasets: [{
        label: "Daily sales",
        data: timeline.map(([, amount]) => amount),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderDashboard() {
  const totalSales = dashboardState.sales.reduce(
    (total, sale) => total + Number(sale.amount || 0),
    0
  );
  const totalExpenses = dashboardState.expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  setText("salesCard", formatCurrency(totalSales));
  setText("expenseCard", formatCurrency(totalExpenses));
  setText("profit", formatCurrency(totalSales - totalExpenses));
  setText("inventoryCount", String(dashboardState.inventory.length));

  renderProducts();
  renderHistory("salesHistory", dashboardState.sales, "sale", "No sales recorded yet.");
  renderHistory("expenseHistory", dashboardState.expenses, "expense", "No expenses recorded yet.");
  renderCharts(totalSales, totalExpenses);
}

function subscribeToDashboardData() {
  const collections = getDashboardCollections();

  const subscribe = (collectionReference, stateKey) => onSnapshot(
    collectionReference,
    snapshot => {
      dashboardState[stateKey] = snapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }));
      renderDashboard();
    },
    error => {
      console.error(error);
      showNotification("Unable to refresh dashboard data.", "error");
    }
  );

  return [
    subscribe(collections.sales, "sales"),
    subscribe(collections.expenses, "expenses"),
    subscribe(collections.inventory, "inventory")
  ];
}

async function handleSale(event) {
  const button = event.currentTarget;

  try {
    const manualAmountInput = document.getElementById("manualSaleAmount").value;
    const quantityInput = document.getElementById("saleQuantity").value;
    const manualAmount = Number(manualAmountInput);
    const quantity = Number(quantityInput);
    const productId = document.getElementById("saleProduct").value;

    if (manualAmountInput.trim() !== "") {
      requirePositiveNumber(manualAmount, "Direct sale amount");
    } else {
      if (!productId) throw new Error("Select a product or enter a direct sale amount.");
      requirePositiveNumber(quantity, "Quantity", { integer: true });
    }

    setButtonLoading(button, true, "Saving sale…");
    await createSale({ productId, quantity, manualAmount });

    document.getElementById("saleQuantity").value = "";
    document.getElementById("manualSaleAmount").value = "";
    document.getElementById("saleProduct").value = "";
    showNotification("Sale recorded successfully.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to record the sale.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleExpense(event) {
  const button = event.currentTarget;

  try {
    const amount = requirePositiveNumber(
      document.getElementById("expenseAmount").value,
      "Expense amount"
    );

    setButtonLoading(button, true, "Saving expense…");
    await createExpense(amount);
    document.getElementById("expenseAmount").value = "";
    showNotification("Expense recorded successfully.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to record the expense.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleHistoryAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const isSale = button.dataset.action === "delete-sale";
  const isExpense = button.dataset.action === "delete-expense";
  if (!isSale && !isExpense) return;

  const confirmed = await confirmAction({
    title: `Delete ${isSale ? "sale" : "expense"}?`,
    message: "This action cannot be undone.",
    confirmLabel: "Delete",
    danger: true
  });

  if (!confirmed) return;

  try {
    setButtonLoading(button, true, "Deleting…");
    if (isSale) await removeSale(button.dataset.recordId);
    if (isExpense) await removeExpense(button.dataset.recordId);
    showNotification(`${isSale ? "Sale" : "Expense"} deleted successfully.`);
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to delete the record.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

export function initializeDashboard() {
  const salesHistory = document.getElementById("salesHistory");
  const expenseHistory = document.getElementById("expenseHistory");

  if (!salesHistory || !expenseHistory) return;

  renderLoadingState(salesHistory);
  renderLoadingState(expenseHistory);

  document
    .querySelector("[data-action='dashboard-add-sale']")
    ?.addEventListener("click", handleSale);
  document
    .querySelector("[data-action='dashboard-add-expense']")
    ?.addEventListener("click", handleExpense);
  salesHistory.addEventListener("click", handleHistoryAction);
  expenseHistory.addEventListener("click", handleHistoryAction);

  subscribeToDashboardData();
}
