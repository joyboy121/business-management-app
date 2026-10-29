import { db, storage } from "../../config/firebase.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const productsCollection = collection(db, "inventory");
const categoriesCollection = collection(db, "categories");

export function getInventoryCollections() {
  return { categories: categoriesCollection, products: productsCollection };
}

export async function uploadProductImage(file) {
  if (!file) return "";

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const imageReference = ref(storage, `products/${crypto.randomUUID()}-${safeFileName}`);
  await uploadBytes(imageReference, file, { contentType: file.type });
  return getDownloadURL(imageReference);
}

export function createCategory({ name, normalizedName }) {
  return addDoc(categoriesCollection, {
    name,
    normalizedName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function renameCategory(categoryId, { name, normalizedName }) {
  const categoryReference = doc(db, "categories", categoryId);
  const productsSnapshot = await getDocs(query(
    productsCollection,
    where("categoryId", "==", categoryId)
  ));
  const batch = writeBatch(db);

  batch.update(categoryReference, {
    name,
    normalizedName,
    updatedAt: serverTimestamp()
  });
  productsSnapshot.forEach(productSnapshot => {
    batch.update(productSnapshot.ref, {
      categoryName: name,
      category: name,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export function deleteCategory(categoryId) {
  return deleteDoc(doc(db, "categories", categoryId));
}

export async function createProduct(product) {
  const productRef = doc(productsCollection);
  const movementRef = doc(collection(db, "stockMovements"));
  await runTransaction(db, async transaction => {
    transaction.set(productRef, { ...product, stockByLocation: { main: Number(product.stock) || 0 }, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    transaction.set(movementRef, { productId: productRef.id, productName: product.name, type: "opening", quantity: Number(product.stock) || 0, delta: Number(product.stock) || 0, fromLocationId: null, toLocationId: "main", note: "Opening stock", createdAt: serverTimestamp() });
  });
  return { id: productRef.id };
}

export async function updateProduct(productId, product) {
  await runTransaction(db, async transaction => {
    const reference = doc(db, "inventory", productId);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("Product no longer exists.");
    const old = snapshot.data(); const nextStock = Number(product.stock) || 0; const previousStock = Number(old.stock) || 0;
    const locations = { ...(old.stockByLocation || {}) }; const mainBefore = Number(locations.main ?? previousStock); const delta = nextStock - previousStock;
    if (delta && mainBefore + delta < 0) throw new Error("Main warehouse stock cannot be reduced below zero.");
    if (delta) locations.main = mainBefore + delta;
    transaction.update(reference, { ...product, stockByLocation: locations, updatedAt: serverTimestamp() });
    if (delta) transaction.set(doc(collection(db, "stockMovements")), { productId, productName: product.name || old.name || "", type: "adjustment", quantity: Math.abs(delta), delta, fromLocationId: delta < 0 ? "main" : null, toLocationId: delta > 0 ? "main" : null, note: "Product edit stock adjustment", createdAt: serverTimestamp() });
  });
}

export async function deleteProduct(productId) {
  await runTransaction(db, async transaction => {
    const reference = doc(db, "inventory", productId); const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) return;
    const product = snapshot.data();
    if ((Number(product.stock) || 0) > 0) throw new Error("Remove or transfer all stock before deleting this product.");
    transaction.delete(reference);
  });
}

export async function adjustProductStock(productId, adjustment) {
  await runTransaction(db, async transaction => {
    const productReference = doc(db, "inventory", productId);
    const snapshot = await transaction.get(productReference);
    if (!snapshot.exists()) throw new Error("This product no longer exists.");
    const product = snapshot.data();
    const currentStock = Number(product.stock) || 0;
    const nextStock = currentStock + adjustment;
    if (nextStock < 0) throw new Error("Stock cannot be reduced below zero.");
    const locations = { ...(product.stockByLocation || {}) };
    const locationStock = Number(locations.main ?? currentStock);
    if (locationStock + adjustment < 0) throw new Error("Main warehouse stock cannot be reduced below zero.");
    locations.main = locationStock + adjustment;
    const movementRef = doc(collection(db, "stockMovements"));
    transaction.update(productReference, { stock: nextStock, stockByLocation: locations, updatedAt: serverTimestamp() });
    transaction.set(movementRef, { productId, productName: product.name || "", type: adjustment > 0 ? "adjustment_in" : "adjustment_out", quantity: Math.abs(adjustment), delta: adjustment, fromLocationId: adjustment < 0 ? "main" : null, toLocationId: adjustment > 0 ? "main" : null, note: "Inventory quick adjustment", createdAt: serverTimestamp() });
  });
}
