import { db } from "./firebase.js";

import {
    addDoc,
    collection,
    doc,
    getDocs,
    updateDoc,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const inventoryRef = collection(db, "inventory");
const invoiceRef = collection(db, "invoices");

let billItems = [];
let grandTotal = 0;

// Load products
async function loadProducts() {

  const snapshot = await getDocs(inventoryRef);

  let select =
    document.getElementById("billProduct");

  select.innerHTML = "";

  snapshot.forEach((docSnap) => {

    let data = docSnap.data();

    let option = document.createElement("option");

    option.value = docSnap.id;

    option.textContent =
      `${data.name} | Stock: ${data.stock}`;

    option.dataset.price = data.price;

    option.dataset.stock = data.stock;

    option.dataset.name = data.name;

    select.appendChild(option);

  });
}

loadProducts();

// Add to bill
window.addToBill = async function () {

  let select =
    document.getElementById("billProduct");

  let quantity =
    Number(document.getElementById("billQuantity").value);

  let selectedOption =
    select.options[select.selectedIndex];

  let productId = selectedOption.value;

  let productName = selectedOption.dataset.name;

  let price =
    Number(selectedOption.dataset.price);

  let stock =
    Number(selectedOption.dataset.stock);

  if (quantity > stock) {
    alert("Not enough stock!");
    return;
  }

  let total = price * quantity;

  grandTotal += total;

  billItems.push({
    productId,
    productName,
    quantity,
    price,
    total
  });

  renderBill();
};

// Render Bill
function renderBill() {

  let table =
    document.getElementById("billTable");

  table.innerHTML = "";

  billItems.forEach(item => {

    let row = `
      <tr>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>${item.price}</td>
        <td>${item.total}</td>
      </tr>
    `;

    table.innerHTML += row;
  });

  document.getElementById("grandTotal")
    .innerText =
    `Grand Total: Rs ${grandTotal}`;
}

// Save invoice
window.saveInvoice = async function () {

  let customerName =
    document.getElementById("customerName").value;

  // Save invoice
  await addDoc(invoiceRef, {
    customerName,
    items: billItems,
    grandTotal,
    date: new Date()
  });

  async function loadInvoiceHistory() {

  const q = query(
    invoiceRef,
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);

  let historyDiv =
    document.getElementById("invoiceHistory");

  historyDiv.innerHTML = "";

  snapshot.forEach((docSnap) => {

    let data = docSnap.data();

    let itemsHTML = "";

    data.items.forEach((item) => {

      itemsHTML += `
        <li>
          ${item.productName}
          (${item.quantity})
          - Rs ${item.total}
        </li>
      `;

    });

    let invoiceDate = "";

    if (data.date?.seconds) {

      invoiceDate =
        new Date(data.date.seconds * 1000)
          .toLocaleString();

    }

    historyDiv.innerHTML += `

      <div class="invoice-card">

        <h3>${data.customerName}</h3>

        <p>
          <b>Total:</b>
          Rs ${data.grandTotal}
        </p>

        <p>
          <b>Date:</b>
          ${invoiceDate}
        </p>

        <h4>Items:</h4>

        <ul>
          ${itemsHTML}
        </ul>

      </div>

    `;

  });
}

  // Update stock
  for (let item of billItems) {

    const productDoc =
      doc(db, "inventory", item.productId);

    const snapshot =
      await getDocs(inventoryRef);

    snapshot.forEach(async (docSnap) => {

      if (docSnap.id === item.productId) {

        let data = docSnap.data();

        await updateDoc(productDoc, {
          stock: data.stock - item.quantity
        });

      }

    });

  }

  alert("Invoice Saved!");

  billItems = [];
  grandTotal = 0;

window.downloadPDF = function () {

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF();

  let customerName =
    document.getElementById("customerName").value;

  // Title
  doc.setFontSize(22);

  doc.text("INVOICE", 80, 20);

  // Customer
  doc.setFontSize(14);

  doc.text(
    `Customer: ${customerName}`,
    20,
    40
  );

  // Table headers
  let y = 60;

  doc.text("Product", 20, y);
  doc.text("Qty", 90, y);
  doc.text("Price", 120, y);
  doc.text("Total", 160, y);

  y += 10;

  // Items
  billItems.forEach((item) => {

    doc.text(item.productName, 20, y);

    doc.text(
      String(item.quantity),
      90,
      y
    );

    doc.text(
      `Rs ${item.price}`,
      120,
      y
    );

    doc.text(
      `Rs ${item.total}`,
      160,
      y
    );

    y += 10;

  });

  // Grand total
  y += 20;

  doc.setFontSize(16);

  doc.text(
    `Grand Total: Rs ${grandTotal}`,
    20,
    y
  );

  // Save PDF
  doc.save(
    `Invoice_${customerName}.pdf`
  );

};

  renderBill();
  loadProducts();
  loadInvoiceHistory();
};