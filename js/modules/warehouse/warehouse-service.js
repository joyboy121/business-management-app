import { db } from "../../config/firebase.js";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const warehouses = collection(db, "warehouses");
const products = collection(db, "inventory");
const movements = collection(db, "stockMovements");

export function subscribeWarehouseData(handlers, onError) {
  setDoc(doc(db, "warehouses", "main"), {
    name: "Main Warehouse",
    updatedAt: serverTimestamp()
  }, { merge: true });

  const stopWarehouses = onSnapshot(warehouses, handlers.warehouses, onError);
  const stopProducts = onSnapshot(products, handlers.products, onError);
  const stopMovements = onSnapshot(movements, handlers.movements, onError);

  return () => {
    stopWarehouses();
    stopProducts();
    stopMovements();
  };
}

export function addWarehouse(name) {
  return addDoc(warehouses, {
    name: name.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function moveStock({ productId, fromId, toId, quantity }) {
  if (!productId) throw new Error("Select a product.");
  if (!fromId || !toId || fromId === toId) {
    throw new Error("Choose two different warehouse locations.");
  }

  await runTransaction(db, async transaction => {
    const productReference = doc(db, "inventory", productId);
    const productSnapshot = await transaction.get(productReference);
    if (!productSnapshot.exists()) throw new Error("Product no longer exists.");

    const product = productSnapshot.data();
    const locations = { ...(product.stockByLocation || {}) };
    const sourceStock = Number(
      locations[fromId] ?? (fromId === "main" ? product.stock : 0)
    );

    if (!Number.isFinite(quantity) || quantity <= 0 || sourceStock < quantity) {
      throw new Error("There is not enough stock at the source location.");
    }

    locations[fromId] = sourceStock - quantity;
    locations[toId] = Number(locations[toId]) + quantity || quantity;

    transaction.update(productReference, {
      stockByLocation: locations,
      updatedAt: serverTimestamp()
    });
    transaction.set(doc(movements), {
      productId,
      productName: product.name || "",
      type: "transfer",
      quantity,
      delta: 0,
      fromLocationId: fromId,
      toLocationId: toId,
      note: "Warehouse transfer",
      createdAt: serverTimestamp()
    });
  });
}

export async function adjustWarehouseStock({
  productId,
  locationId,
  delta,
  note
}) {
  if (!productId || !locationId) {
    throw new Error("Select a product and warehouse location.");
  }

  await runTransaction(db, async transaction => {
    const productReference = doc(db, "inventory", productId);
    const productSnapshot = await transaction.get(productReference);
    if (!productSnapshot.exists()) throw new Error("Product no longer exists.");

    const product = productSnapshot.data();
    const locations = { ...(product.stockByLocation || {}) };
    const currentStock = Number(
      locations[locationId] ?? (locationId === "main" ? product.stock : 0)
    );
    const nextStock = currentStock + delta;

    if (!Number.isFinite(delta) || delta === 0 || nextStock < 0) {
      throw new Error("Adjustment would make the stock invalid or negative.");
    }

    locations[locationId] = nextStock;
    transaction.update(productReference, {
      stock: (Number(product.stock) || 0) + delta,
      stockByLocation: locations,
      updatedAt: serverTimestamp()
    });
    transaction.set(doc(movements), {
      productId,
      productName: product.name || "",
      type: delta > 0 ? "adjustment_in" : "adjustment_out",
      quantity: Math.abs(delta),
      delta,
      fromLocationId: delta < 0 ? locationId : null,
      toLocationId: delta > 0 ? locationId : null,
      note: note.trim() || "Warehouse stock adjustment",
      createdAt: serverTimestamp()
    });
  });
}
