import { db } from "../../config/firebase.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const salesCollection = collection(db, "sales");
const expensesCollection = collection(db, "expenses");
const inventoryCollection = collection(db, "inventory");

export function getDashboardCollections() {
  return {
    sales: salesCollection,
    expenses: expensesCollection,
    inventory: inventoryCollection
  };
}

export async function createSale({ productId, quantity, manualAmount }) {
  if (manualAmount > 0) {
    await addDoc(salesCollection, {
      amount: manualAmount,
      saleType: "manual",
      createdAt: serverTimestamp()
    });
    return;
  }

  await runTransaction(db, async transaction => {
    const productReference = doc(db, "inventory", productId);
    const productSnapshot = await transaction.get(productReference);

    if (!productSnapshot.exists()) {
      throw new Error("The selected product no longer exists.");
    }

    const product = productSnapshot.data();
    const stock = Number(product.stock);
    const price = Number(product.price);

    if (!Number.isFinite(stock) || !Number.isFinite(price)) {
      throw new Error("The selected product has invalid stock or price data.");
    }

    if (quantity > stock) {
      throw new Error("Not enough stock for this sale.");
    }

    const locations = { ...(product.stockByLocation || {}) }; locations.main = Number(locations.main ?? stock) - quantity;
    transaction.update(productReference, { stock: stock - quantity, stockByLocation: locations, updatedAt: serverTimestamp() });
    transaction.set(doc(collection(db, "stockMovements")), { productId, productName: product.name || "Unnamed product", type: "sale", quantity, delta: -quantity, fromLocationId: "main", toLocationId: null, referenceType: "sale", note: "Dashboard sale", createdAt: serverTimestamp() });
    transaction.set(doc(salesCollection), {
      amount: price * quantity,
      saleType: "product",
      productId,
      productName: product.name || "Unnamed product",
      quantity,
      unitPrice: price,
      createdAt: serverTimestamp()
    });
  });
}

export function createExpense(amount) {
  return addDoc(expensesCollection, {
    amount,
    createdAt: serverTimestamp()
  });
}

export async function removeSale(saleId) {
  await runTransaction(db, async transaction => {
    const saleReference = doc(db, "sales", saleId);
    const saleSnapshot = await transaction.get(saleReference);

    if (!saleSnapshot.exists()) return;

    const sale = saleSnapshot.data();

    if (sale.saleType === "product" && sale.productId && sale.quantity) {
      const productReference = doc(db, "inventory", sale.productId);
      const productSnapshot = await transaction.get(productReference);

      if (productSnapshot.exists()) {
        const currentStock = Number(productSnapshot.data().stock) || 0;
        const product = productSnapshot.data(); const quantity = Number(sale.quantity);
        const locations = { ...(product.stockByLocation || {}) }; locations.main = Number(locations.main ?? currentStock) + quantity;
        transaction.update(productReference, { stock: currentStock + quantity, stockByLocation: locations, updatedAt: serverTimestamp() });
        transaction.set(doc(collection(db, "stockMovements")), { productId: sale.productId, productName: sale.productName || product.name || "", type: "sale_reversal", quantity, delta: quantity, fromLocationId: null, toLocationId: "main", referenceType: "sale", referenceId: saleId, note: "Sale deleted", createdAt: serverTimestamp() });
      }
    }

    transaction.delete(saleReference);
  });
}

export function removeExpense(expenseId) {
  return deleteDoc(doc(db, "expenses", expenseId));
}
