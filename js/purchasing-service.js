import { db } from "./config/firebase.js";
import {
  addDoc,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const orders = collection(db, "purchaseOrders");

export function getPurchasingCollections() {
  return {
    orders,
    products: collection(db, "inventory"),
    suppliers: collection(db, "suppliers")
  };
}

export function createPurchaseOrder(data) {
  return addDoc(orders, {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function receivePurchaseOrder(orderId) {
  await runTransaction(db, async transaction => {
    const orderReference = doc(db, "purchaseOrders", orderId);
    const orderSnapshot = await transaction.get(orderReference);

    if (!orderSnapshot.exists()) {
      throw new Error("Purchase order no longer exists.");
    }

    const order = orderSnapshot.data();
    if (order.status !== "pending") {
      throw new Error("Only pending purchase orders can be received.");
    }

    const productReference = doc(db, "inventory", order.productId);
    const productSnapshot = await transaction.get(productReference);
    if (!productSnapshot.exists()) {
      throw new Error("The ordered product no longer exists.");
    }

    const product = productSnapshot.data();
    const quantity = Number(order.quantity);
    const locations = { ...(product.stockByLocation || {}) };
    locations.main = Number(locations.main ?? product.stock) + quantity;

    transaction.update(productReference, {
      stock: (Number(product.stock) || 0) + quantity,
      stockByLocation: locations,
      updatedAt: serverTimestamp()
    });
    transaction.set(doc(collection(db, "stockMovements")), {
      productId: order.productId,
      productName: order.productName || product.name || "",
      type: "purchase_receipt",
      quantity,
      delta: quantity,
      fromLocationId: null,
      toLocationId: "main",
      referenceType: "purchaseOrder",
      referenceId: orderId,
      note: "Purchase order receipt",
      createdAt: serverTimestamp()
    });
    transaction.update(orderReference, {
      status: "received",
      receivedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
}

export function cancelPurchaseOrder(orderId) {
  return updateDoc(doc(db, "purchaseOrders", orderId), {
    status: "cancelled",
    updatedAt: serverTimestamp()
  });
}
