import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { confirmAction } from "../../ui/dialog.js";
import { setButtonLoading } from "../../ui/loading.js";
import { showNotification } from "../../ui/notifications.js";
import { formatCurrency } from "../../utils/formatters.js";
import { requirePositiveNumber } from "../../validation/number-validation.js";
import { requireText } from "../../validation/input-validation.js";
import {
  adjustProductStock,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getInventoryCollections,
  renameCategory,
  updateProduct,
  uploadProductImage
} from "./inventory-service.js";

const inventoryState = {
  categories: [],
  products: []
};

function normalizedText(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function getCategoryName(product) {
  return product.categoryName || product.category || "Uncategorized";
}

function findCategory(categoryId) {
  return inventoryState.categories.find(category => category.id === categoryId);
}

function setLoadingRows() {
  const tableBody = document.getElementById("inventoryProductTableBody");
  if (!tableBody) return;

  tableBody.replaceChildren();

  for (let index = 0; index < 3; index += 1) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    const skeleton = document.createElement("div");
    skeleton.className = "inventory-skeleton";
    cell.appendChild(skeleton);
    row.appendChild(cell);
    tableBody.appendChild(row);
  }
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

function renderCategories() {
  const list = document.getElementById("categoryList");
  const productCategory = document.getElementById("productCategory");
  const categoryFilter = document.getElementById("categoryFilter");
  if (!list || !productCategory || !categoryFilter) return;

  const sortedCategories = [...inventoryState.categories]
    .sort((first, second) => first.name.localeCompare(second.name));
  const selectedCategoryId = productCategory.value;
  const selectedFilter = categoryFilter.value;

  list.replaceChildren();
  productCategory.replaceChildren();
  categoryFilter.replaceChildren();

  const productPlaceholder = new Option("Select a category", "");
  productPlaceholder.disabled = true;
  productPlaceholder.selected = !selectedCategoryId;
  productCategory.add(productPlaceholder);
  categoryFilter.add(new Option("All categories", ""));

  if (!sortedCategories.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "inventory-empty-state";
    emptyState.textContent = "No categories yet. Create one before adding a product.";
    list.appendChild(emptyState);
    return;
  }

  sortedCategories.forEach(category => {
    productCategory.add(new Option(category.name, category.id));
    categoryFilter.add(new Option(category.name, category.id));

    const card = document.createElement("article");
    card.className = "inventory-category-card";
    const heading = document.createElement("h3");
    heading.textContent = category.name;
    const actions = document.createElement("div");
    actions.className = "inventory-category-actions";
    actions.append(
      createButton("Edit", "edit-category", category.id),
      createButton("Delete", "delete-category", category.id, "danger")
    );
    card.append(heading, actions);
    list.appendChild(card);
  });

  if (sortedCategories.some(category => category.id === selectedCategoryId)) {
    productCategory.value = selectedCategoryId;
  }
  if (sortedCategories.some(category => category.id === selectedFilter)) {
    categoryFilter.value = selectedFilter;
  }
}

function getFilteredProducts() {
  const query = normalizedText(document.getElementById("searchInput")?.value);
  const categoryId = document.getElementById("categoryFilter")?.value;
  const sortValue = document.getElementById("productSort")?.value || "name-asc";

  const products = inventoryState.products.filter(product => {
    const matchesQuery = [product.name, getCategoryName(product)]
      .some(value => normalizedText(value).includes(query));
    const matchesCategory = !categoryId || product.categoryId === categoryId;
    return matchesQuery && matchesCategory;
  });

  const [sortField, sortDirection] = sortValue.split("-");
  const direction = sortDirection === "desc" ? -1 : 1;

  return products.sort((first, second) => {
    if (sortField === "name") {
      return String(first.name).localeCompare(String(second.name)) * direction;
    }
    return (Number(first[sortField]) - Number(second[sortField])) * direction;
  });
}

function renderProducts() {
  const tableBody = document.getElementById("inventoryProductTableBody");
  const emptyState = document.getElementById("inventoryProductEmpty");
  const count = document.getElementById("inventoryProductCount");
  if (!tableBody || !emptyState || !count) return;

  const products = getFilteredProducts();
  tableBody.replaceChildren();
  count.textContent = `${products.length} of ${inventoryState.products.length} products`;

  emptyState.hidden = products.length > 0;
  emptyState.textContent = inventoryState.products.length
    ? "No products match the current search or filter."
    : "No products yet. Add your first product above.";

  products.forEach(product => {
    const row = document.createElement("tr");
    const productCell = document.createElement("td");
    const productDetail = document.createElement("div");
    productDetail.className = "inventory-product-name";

    if (product.imageUrl) {
      const image = document.createElement("img");
      image.className = "inventory-product-thumbnail";
      image.src = product.imageUrl;
      image.alt = "";
      productDetail.appendChild(image);
    }

    const name = document.createElement("strong");
    name.textContent = product.name;
    productDetail.appendChild(name);
    productCell.appendChild(productDetail);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = getCategoryName(product);

    const stockCell = document.createElement("td");
    const stock = Number(product.stock) || 0;
    stockCell.textContent = String(stock);
    if (stock <= 5) {
      const warning = document.createElement("span");
      warning.className = "inventory-stock-alert";
      warning.textContent = " Low stock";
      stockCell.appendChild(warning);
    }

    const priceCell = document.createElement("td");
    priceCell.textContent = formatCurrency(product.price);

    const actionCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "inventory-product-actions";
    actions.append(
      createButton("+ Stock", "increase-stock", product.id),
      createButton("- Stock", "decrease-stock", product.id),
      createButton("Edit", "edit-product", product.id),
      createButton("Delete", "delete-product", product.id, "danger")
    );
    actionCell.appendChild(actions);
    row.append(productCell, categoryCell, stockCell, priceCell, actionCell);
    tableBody.appendChild(row);
  });
}

function renderInventory() {
  renderCategories();
  renderProducts();
}

function categoryExists(name, excludeId = "") {
  const value = normalizedText(name);
  return inventoryState.categories.some(category =>
    category.id !== excludeId && normalizedText(category.name) === value
  );
}

function productExists(name, excludeId = "") {
  const value = normalizedText(name);
  return inventoryState.products.some(product =>
    product.id !== excludeId && normalizedText(product.name) === value
  );
}

function buildProductData({ name, categoryId, stock, price, imageUrl }) {
  const category = findCategory(categoryId);
  if (!category) throw new Error("Select a valid category.");

  return {
    name,
    normalizedName: normalizedText(name),
    categoryId,
    categoryName: category.name,
    // Retained for current Billing and historical Inventory compatibility.
    category: category.name,
    stock,
    price,
    ...(imageUrl ? { imageUrl } : {})
  };
}

async function handleAddCategory(event) {
  const button = event.currentTarget;

  try {
    const name = requireText(document.getElementById("categoryName").value, "Category name");
    if (categoryExists(name)) throw new Error("A category with this name already exists.");

    setButtonLoading(button, true, "Adding...");
    await createCategory({ name, normalizedName: normalizedText(name) });
    document.getElementById("categoryName").value = "";
    showNotification("Category added successfully.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to add the category.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleAddProduct(event) {
  const button = event.currentTarget;

  try {
    const name = requireText(document.getElementById("productName").value, "Product name");
    if (productExists(name)) throw new Error("A product with this name already exists.");

    const categoryId = document.getElementById("productCategory").value;
    const stock = requirePositiveNumber(document.getElementById("productStock").value, "Opening stock", { allowZero: true, integer: true });
    const price = requirePositiveNumber(document.getElementById("productPrice").value, "Unit price");
    const imageFile = document.getElementById("productImage").files[0];

    if (imageFile && !["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
      throw new Error("Product image must be a PNG, JPEG, or WebP file.");
    }

    setButtonLoading(button, true, imageFile ? "Uploading image..." : "Adding product...");
    const imageUrl = await uploadProductImage(imageFile);
    await createProduct(buildProductData({ name, categoryId, stock, price, imageUrl }));

    document.getElementById("productName").value = "";
    document.getElementById("productStock").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productImage").value = "";
    showNotification("Product added successfully.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to add the product.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

function openEditDialog({ title, fields, onSave }) {
  const overlay = document.createElement("div");
  overlay.className = "erp-dialog-overlay";
  const dialog = document.createElement("form");
  dialog.className = "erp-dialog inventory-edit-dialog";
  dialog.innerHTML = `<h2>${title}</h2>`;

  fields.forEach(field => {
    const wrapper = document.createElement("div");
    wrapper.className = "form-field";
    const label = document.createElement("label");
    label.htmlFor = field.id;
    label.textContent = field.label;
    const input = field.options ? document.createElement("select") : document.createElement("input");
    input.id = field.id;
    input.name = field.id;
    input.value = field.value ?? "";
    input.type = field.type || "text";
    input.required = true;
    if (field.min !== undefined) input.min = String(field.min);
    if (field.step !== undefined) input.step = String(field.step);
    field.options?.forEach(option => input.add(new Option(option.label, option.value)));
    if (field.options) input.value = field.value;
    wrapper.append(label, input);
    dialog.appendChild(wrapper);
  });

  const actions = document.createElement("div");
  actions.className = "erp-dialog-actions";
  const cancelButton = document.createElement("button");
  cancelButton.className = "erp-button erp-button--secondary";
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  const saveButton = document.createElement("button");
  saveButton.className = "erp-button erp-button--primary";
  saveButton.type = "submit";
  saveButton.textContent = "Save";
  actions.append(cancelButton, saveButton);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  cancelButton.addEventListener("click", close);
  overlay.addEventListener("click", event => {
    if (event.target === overlay) close();
  });
  dialog.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      setButtonLoading(saveButton, true, "Saving...");
      const formData = Object.fromEntries(new FormData(dialog));
      await onSave(formData);
      close();
    } catch (error) {
      console.error(error);
      showNotification(error.message || "Unable to save changes.", "error");
    } finally {
      setButtonLoading(saveButton, false);
    }
  });
  dialog.querySelector("input, select")?.focus();
}

function editCategory(categoryId) {
  const category = findCategory(categoryId);
  if (!category) return;

  openEditDialog({
    title: "Edit Category",
    fields: [{ id: "name", label: "Category name", value: category.name }],
    onSave: async ({ name }) => {
      const value = requireText(name, "Category name");
      if (categoryExists(value, categoryId)) throw new Error("A category with this name already exists.");
      await renameCategory(categoryId, { name: value, normalizedName: normalizedText(value) });
      showNotification("Category updated successfully.");
    }
  });
}

function editProduct(productId) {
  const product = inventoryState.products.find(item => item.id === productId);
  if (!product) return;
  const matchingCategory = inventoryState.categories.find(category =>
    category.id === product.categoryId || category.name === getCategoryName(product)
  );

  openEditDialog({
    title: "Edit Product",
    fields: [
      { id: "name", label: "Product name", value: product.name },
      {
        id: "categoryId",
        label: "Category",
        value: matchingCategory?.id || "",
        options: inventoryState.categories.map(category => ({ label: category.name, value: category.id }))
      },
      { id: "stock", label: "Stock", value: product.stock, type: "number", min: 0, step: 1 },
      { id: "price", label: "Unit price", value: product.price, type: "number", min: 0.01, step: 0.01 }
    ],
    onSave: async ({ name, categoryId, stock, price }) => {
      const value = requireText(name, "Product name");
      if (productExists(value, productId)) throw new Error("A product with this name already exists.");
      const productData = buildProductData({
        name: value,
        categoryId,
        stock: requirePositiveNumber(stock, "Stock", { allowZero: true, integer: true }),
        price: requirePositiveNumber(price, "Unit price"),
        imageUrl: product.imageUrl
      });
      await updateProduct(productId, productData);
      showNotification("Product updated successfully.");
    }
  });
}

async function handleCategoryAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, recordId } = button.dataset;
  if (action === "edit-category") return editCategory(recordId);
  if (action !== "delete-category") return;

  const category = findCategory(recordId);
  const isUsed = inventoryState.products.some(product =>
    product.categoryId === recordId || getCategoryName(product) === category?.name
  );
  if (isUsed) {
    showNotification("Move or update products in this category before deleting it.", "error");
    return;
  }

  if (!await confirmAction({ title: "Delete category?", message: "This category will be permanently removed.", confirmLabel: "Delete", danger: true })) return;

  try {
    setButtonLoading(button, true, "Deleting...");
    await deleteCategory(recordId);
    showNotification("Category deleted successfully.");
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to delete the category.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function handleProductAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, recordId } = button.dataset;
  if (action === "edit-product") return editProduct(recordId);

  try {
    if (action === "delete-product") {
      const confirmed = await confirmAction({ title: "Delete product?", message: "This product will be permanently removed.", confirmLabel: "Delete", danger: true });
      if (!confirmed) return;
      setButtonLoading(button, true, "Deleting...");
      await deleteProduct(recordId);
      showNotification("Product deleted successfully.");
      return;
    }

    if (action === "increase-stock" || action === "decrease-stock") {
      setButtonLoading(button, true, "Updating...");
      await adjustProductStock(recordId, action === "increase-stock" ? 1 : -1);
      showNotification("Stock updated successfully.");
    }
  } catch (error) {
    console.error(error);
    showNotification(error.message || "Unable to update product stock.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

function subscribeToInventory() {
  const collections = getInventoryCollections();
  const subscribe = (reference, stateKey) => onSnapshot(reference, snapshot => {
    inventoryState[stateKey] = snapshot.docs.map(documentSnapshot => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data()
    }));
    renderInventory();
  }, error => {
    console.error(error);
    showNotification("Unable to refresh inventory data.", "error");
  });

  return [subscribe(collections.categories, "categories"), subscribe(collections.products, "products")];
}

export function initializeInventory() {
  const categoryList = document.getElementById("categoryList");
  const productTable = document.getElementById("inventoryProductTableBody");
  if (!categoryList || !productTable) return;

  setLoadingRows();
  document.querySelector("[data-action='inventory-add-category']")?.addEventListener("click", handleAddCategory);
  document.querySelector("[data-action='inventory-add-product']")?.addEventListener("click", handleAddProduct);
  categoryList.addEventListener("click", handleCategoryAction);
  productTable.addEventListener("click", handleProductAction);
  ["searchInput", "categoryFilter", "productSort"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", renderProducts);
    document.getElementById(id)?.addEventListener("change", renderProducts);
  });
  document.getElementById("productImage")?.addEventListener("change", event => {
    const preview = document.getElementById("productImagePreview");
    const file = event.target.files[0];
    if (!preview) return;

    if (!file) {
      preview.hidden = true;
      preview.removeAttribute("src");
      return;
    }

    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  });

  subscribeToInventory();
}
