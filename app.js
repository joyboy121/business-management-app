console.log("App is running");  
let pieChartInstance = null;
let lineChartInstance = null;

import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const salesRef = collection(db, "sales");
const expenseRef = collection(db, "expenses");
const inventoryRef = collection(db, "inventory");

async function loadProducts() {

  const snapshot = await getDocs(inventoryRef);

  let select = document.getElementById("saleProduct");

  select.innerHTML = "";

  snapshot.forEach(docSnap => {

    let data = docSnap.data();

    let option = document.createElement("option");

    option.value = docSnap.id;

    option.textContent =
      `${data.name} (Stock: ${data.stock})`;

    select.appendChild(option);

  });
}

loadProducts();

// Add Sale
window.addSale = async function () {

  let productId =
    document.getElementById("saleProduct").value;

  let quantity =
    Number(document.getElementById("saleQuantity").value);

  const snapshot = await getDocs(inventoryRef);

  snapshot.forEach(async (docSnap) => {

    if (docSnap.id === productId) {

      let data = docSnap.data();

      if (data.stock < quantity) {
        alert("Not enough stock!");
        return;
      }

      // Decrease stock
      const productDoc =
        doc(db, "inventory", productId);

      await updateDoc(productDoc, {
        stock: data.stock - quantity
      });

      // Save sale
      await addDoc(salesRef, {
        product: data.name,
        quantity,
        total: data.price * quantity,
        date: new Date()
      });

      loadProducts();
      loadData();

      alert("Sale Added!");
    }

  });

};

// Add Expense
window.addExpense = async function () {
  let amount = Number(document.getElementById("expenseAmount").value);

  await addDoc(expenseRef, {  
    amount: amount,
    date: new Date()
    
  });
  

  loadData();
};


// Load Data from Firebase
async function loadData() {
  let totalSales = 0;
  let totalExpenses = 0;

  const salesSnap = await getDocs(salesRef);
  salesSnap.forEach(doc => {
    totalSales += doc.data().amount;
  });

  const expenseSnap = await getDocs(expenseRef);
  expenseSnap.forEach(doc => {
    totalExpenses += doc.data().amount;
  });

  let profit = totalSales - totalExpenses;

  document.getElementById("profit").innerText =
    `Profit: Rs ${profit}`;

  drawCharts(totalSales, totalExpenses);

  // Update cards

document.getElementById("salesCard").innerText =
  `Rs ${sales}`;


document.getElementById("expenseCard").innerText =
  `Rs ${expenses}`;
}

async function loadInventoryCount() {

  const snapshot = await getDocs(inventoryRef);

  document.getElementById("inventoryCount")
    .innerText = snapshot.size;
}

loadInventoryCount();

// Charts
function drawCharts(sales, expenses) {

  // 🔥 Destroy old charts first
  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  if (lineChartInstance) {
    lineChartInstance.destroy();
  }

  // ✅ Create Pie Chart
  pieChartInstance = new Chart(document.getElementById("pieChart"), {
    type: 'pie',
    data: {
      labels: ["Sales", "Expenses"],
      datasets: [{
        data: [sales, expenses]
      }]
    }
  });

  // ✅ Create Line Chart
  lineChartInstance = new Chart(document.getElementById("lineChart"), {
    type: 'line',
    data: {
      labels: ["Sales", "Expenses"],
      datasets: [{
        label: "Overview",
        data: [sales, expenses]
      }]
    }
  });
}

// Load data when page opens
loadData();
