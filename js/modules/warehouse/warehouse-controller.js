import { showNotification } from "../../ui/notifications.js";
import { setButtonLoading } from "../../ui/loading.js";
import { formatDate } from "../../utils/formatters.js";
import { requirePositiveNumber } from "../../validation/number-validation.js";
import {
  addWarehouse,
  adjustWarehouseStock,
  moveStock,
  subscribeWarehouseData
} from "./warehouse-service.js";

const state = {
  warehouses: [],
  products: [],
  movements: []
};

function sortedWarehouses() {
  return [
    { id: "main", name: "Main Warehouse" },
    ...state.warehouses.filter(warehouse => warehouse.id !== "main")
  ].sort((first, second) => {
    if (first.id === "main") return -1;
    if (second.id === "main") return 1;
    return first.name.localeCompare(second.name);
  });
}

function fillSelect(select, items, selectedValue) {
  select.replaceChildren();
  items.forEach(item => select.add(new Option(item.name, item.id)));
  if (items.some(item => item.id === selectedValue)) {
    select.value = selectedValue;
  }
}

function renderSelectors() {
  const warehouses = sortedWarehouses();
  ["warehouseFrom", "warehouseTo", "warehouseAdjustLocation"].forEach(id => {
    const select = document.getElementById(id);
    fillSelect(select, warehouses, select.value);
  });

  const products = state.products
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name));
  ["warehouseProduct", "warehouseAdjustProduct"].forEach(id => {
    const select = document.getElementById(id);
    fillSelect(select, products, select.value);
  });
}

function renderStockTable() {
  const tableBody = document.getElementById("warehouseStock");
  const emptyState = document.getElementById("warehouseStockEmpty");
  const warehouses = sortedWarehouses();
  const rows = [];

  state.products.forEach(product => {
    warehouses.forEach(warehouse => {
      const stock = Number(
        product.stockByLocation?.[warehouse.id]
        ?? (warehouse.id === "main" ? product.stock : 0)
      );
      if (stock > 0) rows.push({ product, warehouse, stock });
    });
  });

  tableBody.replaceChildren();
  emptyState.hidden = rows.length > 0;
  rows.forEach(({ product, warehouse, stock }) => {
    const row = document.createElement("tr");
    [product.name, warehouse.name, String(stock)].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
}

function renderMovementTable() {
  const tableBody = document.getElementById("warehouseMovements");
  const emptyState = document.getElementById("warehouseMovementEmpty");
  const warehouses = sortedWarehouses();
  const rows = state.movements
    .slice()
    .sort((first, second) =>
      (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0)
    )
    .slice(0, 100);

  tableBody.replaceChildren();
  emptyState.hidden = rows.length > 0;
  rows.forEach(movement => {
    const row = document.createElement("tr");
    const source = warehouses.find(item => item.id === movement.fromLocationId);
    const destination = warehouses.find(item => item.id === movement.toLocationId);
    const details = movement.type === "transfer"
      ? (source?.name || "Unknown location") + " → " + (destination?.name || "Unknown location")
      : movement.note || "—";
    [
      formatDate(movement.createdAt?.toDate?.()),
      movement.productName || "Product",
      movement.type.replaceAll("_", " "),
      String(movement.quantity ?? ""),
      details
    ].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
}

function render() {
  renderSelectors();
  renderStockTable();
  renderMovementTable();
}

function reportError(error) {
  console.error(error);
  showNotification(error.message || "Warehouse update failed.", "error");
}

function bindAction(selector, action, label, successMessage) {
  document.querySelector(selector)?.addEventListener("click", async event => {
    const button = event.currentTarget;
    setButtonLoading(button, true, label);
    try {
      await action();
      showNotification(successMessage);
    } catch (error) {
      reportError(error);
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export function initializeWarehouse() {
  bindAction(
    "[data-action=warehouse-add]",
    async () => {
      const input = document.getElementById("warehouseName");
      const name = input.value.trim();
      if (!name) throw new Error("Enter a location name.");
      if (state.warehouses.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        throw new Error("A location with this name already exists.");
      }
      await addWarehouse(name);
      input.value = "";
    },
    "Adding…",
    "Warehouse location added."
  );

  bindAction(
    "[data-action=warehouse-transfer]",
    async () => {
      await moveStock({
        productId: document.getElementById("warehouseProduct").value,
        fromId: document.getElementById("warehouseFrom").value,
        toId: document.getElementById("warehouseTo").value,
        quantity: requirePositiveNumber(
          document.getElementById("warehouseQuantity").value,
          "Quantity",
          { integer: true }
        )
      });
      document.getElementById("warehouseQuantity").value = "";
    },
    "Transferring…",
    "Stock transferred and recorded."
  );

  bindAction(
    "[data-action=warehouse-adjust]",
    async () => {
      const direction = document.getElementById("warehouseAdjustDirection").value;
      const quantity = requirePositiveNumber(
        document.getElementById("warehouseAdjustQuantity").value,
        "Quantity",
        { integer: true }
      );
      await adjustWarehouseStock({
        productId: document.getElementById("warehouseAdjustProduct").value,
        locationId: document.getElementById("warehouseAdjustLocation").value,
        delta: direction === "in" ? quantity : -quantity,
        note: document.getElementById("warehouseAdjustNote").value
      });
      document.getElementById("warehouseAdjustQuantity").value = "";
      document.getElementById("warehouseAdjustNote").value = "";
    },
    "Saving…",
    "Stock adjustment recorded."
  );

  return subscribeWarehouseData({
    warehouses: snapshot => {
      state.warehouses = snapshot.docs.map(record => ({
        id: record.id,
        ...record.data()
      }));
      render();
    },
    products: snapshot => {
      state.products = snapshot.docs.map(record => ({
        id: record.id,
        ...record.data()
      }));
      render();
    },
    movements: snapshot => {
      state.movements = snapshot.docs.map(record => ({
        id: record.id,
        ...record.data()
      }));
      render();
    }
  }, reportError);
}
