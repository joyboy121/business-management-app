import { db } from "./firebase-config.js";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const inventoryRef = collection(db, "inventory");
const categoryRef = collection(db, "categories");

// Add Product
window.addProduct = async function () {

  try {

    let name =
      document.getElementById("productName").value;

    let category =
      document.getElementById("productCategory").value;

    let stock =
      Number(document.getElementById("productStock").value);

    let price =
      Number(document.getElementById("productPrice").value);

    await addDoc(inventoryRef, {
      name,
      category,
      stock,
      price,
      createdAt: new Date()
    });

    alert("Product Added Successfully ✅");

    loadInventory();

  } catch (error) {

    console.error(error);

    alert("Error adding product");

  }
};

// Load Inventory
async function loadInventory() {

  const snapshot = await getDocs(inventoryRef);
  let list = document.getElementById("productList");
  list.innerHTML = "";

  snapshot.forEach((docSnap) => {

    let data = docSnap.data();

    let li = document.createElement("li");

   let lowStockWarning =
  data.stock <= 5
    ? `<span class="low-stock">LOW STOCK!</span>`
    : "";

productList.innerHTML += `

<div class="product-card">

  <h3>${data.name}</h3>

  <p>Category: ${data.category}</p>

  <p>Stock: ${data.stock}</p>

  <p>Price: Rs ${data.price}</p>

  ${
    data.stock < 5
    ? "<p class='low-stock'>Low Stock!</p>"
    : ""
  }

  <button onclick="editProduct('${docSnap.id}',
    '${data.name}',
    '${data.category}',
    '${data.stock}',
    '${data.price}')">

    Edit

  </button>

  <button onclick="deleteProduct('${docSnap.id}')">

    Delete

  </button>

</div>

`;

    list.appendChild(li);

  });
}

document
  .getElementById("searchInput")
  .addEventListener("input", function () {

    let search = this.value.toLowerCase();

    let items = document.querySelectorAll("#productList li");

    items.forEach(item => {

      let text = item.innerText.toLowerCase();

      item.style.display =
        text.includes(search) ? "block" : "none";
    });

});

import {
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.addCategory = async function () {

  let categoryName =
    document.getElementById("categoryName").value;

  if (!categoryName) {

    alert("Enter category name");

    return;
  }
  
  async function loadCategories() {

  let select =
    document.getElementById("productCategory");

  let categoryList =
    document.getElementById("categoryList");

  select.innerHTML = "";

  categoryList.innerHTML = "";

  const snapshot =
    await getDocs(categoryRef);

  snapshot.forEach((docSnap) => {

    let data = docSnap.data();

    // dropdown
    select.innerHTML += `

      <option value="${data.name}">
        ${data.name}
      </option>

    `;

    // category cards
    categoryList.innerHTML += `

      <div class="category-card">

        <h3>${data.name}</h3>

        <button onclick="editCategory(
          '${docSnap.id}',
          '${data.name}'
        )">

          Edit

        </button>

        <button onclick="deleteCategory(
          '${docSnap.id}'
        )">

          Delete

        </button>

      </div>

    `;

  });

}

  await addDoc(categoryRef, {
    name: categoryName
  });

  alert("Category Added ✅");

  loadCategories();

};

window.editCategory = async function (
  id,
  oldName
) {

  let newName =
    prompt(
      "Edit Category",
      oldName
    );

  if (!newName) return;

  await updateDoc(
    doc(db, "categories", id),
    {
      name: newName
    }
  );

  alert("Category Updated ✅");

  loadCategories();

};
window.deleteCategory = async function (
  id
) {

  let confirmDelete =
    confirm(
      "Delete this category?"
    );

  if (!confirmDelete) return;

  await deleteDoc(
    doc(db, "categories", id)
  );

  alert("Category Deleted");

  loadCategories();

};


window.editProduct = async function (
  id,
  oldName,
  oldCategory,
  oldStock,
  oldPrice
) {

  let name =
    prompt("Edit Product Name", oldName);

  let category =
    prompt("Edit Category", oldCategory);

  let stock =
    prompt("Edit Stock", oldStock);

  let price =
    prompt("Edit Price", oldPrice);

  await updateDoc(doc(db, "inventory", id), {

    name,
    category,
    stock: Number(stock),
    price: Number(price)

  });

  alert("Product Updated");

  loadInventory();
};

window.deleteProduct = async function (id) {

  let confirmDelete =
    confirm("Delete this product?");

  if (!confirmDelete) return;

  await deleteDoc(doc(db, "inventory", id));

  alert("Product Deleted");

  loadInventory();
};

// Increase Stock
window.increaseStock = async function(id, currentStock) {

  const productDoc = doc(db, "inventory", id);

  await updateDoc(productDoc, {
    stock: currentStock + 1
  });

  loadInventory();
};

// Decrease Stock
window.decreaseStock = async function(id, currentStock) {

  if(currentStock <= 0) return;

  const productDoc = doc(db, "inventory", id);

  await updateDoc(productDoc, {
    stock: currentStock - 1
  });

  loadInventory();
};

// Initial Load
loadInventory();
loadCategories();