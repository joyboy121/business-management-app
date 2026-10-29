import { db } from "../../config/firebase.js";
import { collection, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const products = collection(db, "inventory");
const invoices = collection(db, "invoices");
const counter = doc(db, "settings", "invoiceCounter");

export function getBillingCollections() { return { customers: collection(db, "customers"), invoices, products }; }

export async function saveInvoice({ customer, items, grandTotal, subtotal = grandTotal, taxRate = 0 }) {
  await runTransaction(db, async transaction => {
    const counterSnapshot = await transaction.get(counter);
    const nextNumber = Number(counterSnapshot.data()?.nextNumber) || 1;
    const invoiceRef = doc(invoices);
    const totals = new Map();
    items.forEach(item => totals.set(item.productId, (totals.get(item.productId) || 0) + Number(item.quantity)));
    const productRefs = [...totals.keys()].map(id => doc(db, "inventory", id));
    const snapshots = await Promise.all(productRefs.map(reference => transaction.get(reference)));
    snapshots.forEach((snapshot, index) => {
      const id = productRefs[index].id;
      if (!snapshot.exists()) throw new Error("A selected product no longer exists.");
      if (Number(snapshot.data().stock) < totals.get(id)) throw new Error("Not enough stock for " + snapshot.data().name + ".");
    });
    snapshots.forEach((snapshot, index) => {
      const product = snapshot.data(); const id = productRefs[index].id; const quantity = totals.get(id);
      const locations = { ...(product.stockByLocation || {}) }; locations.main = Number(locations.main ?? product.stock) - quantity;
      transaction.update(productRefs[index], { stock: Number(product.stock) - quantity, stockByLocation: locations, updatedAt: serverTimestamp() });
      transaction.set(doc(collection(db, "stockMovements")), { productId: id, productName: product.name || "", type: "sale", quantity, delta: -quantity, fromLocationId: "main", toLocationId: null, referenceType: "invoice", referenceId: invoiceRef.id, note: "Invoice " + nextNumber, createdAt: serverTimestamp() });
    });
    transaction.set(counter, { nextNumber: nextNumber + 1, updatedAt: serverTimestamp() }, { merge: true });
    const prefix = (() => { try { return JSON.parse(localStorage.getItem("erp-business-settings") || "{}").invoicePrefix || "INV"; } catch { return "INV"; } })();
    transaction.set(invoiceRef, { invoiceNumber: prefix + "-" + String(nextNumber).padStart(6, "0"), subtotal, taxRate, taxAmount: grandTotal - subtotal, status: "active", customerId: customer.id, customerName: customer.name, customerSnapshot: { name: customer.name, phone: customer.phone || "", email: customer.email || "", address: customer.address || "" }, items, grandTotal, createdAt: serverTimestamp(), date: serverTimestamp() });
  });
}

export async function voidInvoice(invoiceId) {
  await runTransaction(db, async transaction => {
    const invoiceRef = doc(db, "invoices", invoiceId); const invoiceSnapshot = await transaction.get(invoiceRef);
    if (!invoiceSnapshot.exists() || invoiceSnapshot.data().status === "voided") return;
    const invoice = invoiceSnapshot.data();
    if (!invoice.invoiceNumber) throw new Error("Legacy invoices cannot be voided automatically because their stock adjustment cannot be verified.");
    const totals = new Map();
    (invoice.items || []).forEach(item => totals.set(item.productId, (totals.get(item.productId) || 0) + Number(item.quantity)));
    const refs = [...totals.keys()].map(id => doc(db, "inventory", id));
    const snapshots = await Promise.all(refs.map(reference => transaction.get(reference)));
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists()) return;
      const product = snapshot.data(); const id = refs[index].id; const quantity = totals.get(id);
      const locations = { ...(product.stockByLocation || {}) }; locations.main = Number(locations.main ?? product.stock) + quantity;
      transaction.update(refs[index], { stock: (Number(product.stock) || 0) + quantity, stockByLocation: locations, updatedAt: serverTimestamp() });
      transaction.set(doc(collection(db, "stockMovements")), { productId: id, productName: product.name || "", type: "sale_reversal", quantity, delta: quantity, fromLocationId: null, toLocationId: "main", referenceType: "invoice", referenceId: invoiceId, note: "Voided invoice " + invoice.invoiceNumber, createdAt: serverTimestamp() });
    });
    transaction.update(invoiceRef, { status: "voided", voidedAt: serverTimestamp() });
  });
}
