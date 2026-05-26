import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ledgerRef = collection(db, "ledger");

// Add Entry
window.addLedgerEntry = async function () {

  let customer =
    document.getElementById("ledgerCustomer").value;

  let type =
    document.getElementById("ledgerType").value;

  let amount =
    Number(document.getElementById("ledgerAmount").value);

  let description =
    document.getElementById("ledgerDescription").value;

  await addDoc(ledgerRef, {
    customer,
    type,
    amount,
    description,
    date: new Date()
  });

  alert("Ledger Entry Saved!");

  loadLedger();
};

// Load Ledger
async function loadLedger() {

  const snapshot = await getDocs(ledgerRef);

  let table =
    document.getElementById("ledgerTable");

  table.innerHTML = "";

  let balances = {};

  snapshot.forEach((docSnap) => {

    let data = docSnap.data();

    // Add row
    let row = `
      <tr>
        <td>${data.customer}</td>
        <td>${data.type}</td>
        <td>Rs ${data.amount}</td>
        <td>${data.description}</td>
        <td>
          ${new Date(data.date.seconds * 1000)
            .toLocaleDateString()}
        </td>
      </tr>
    `;

    table.innerHTML += row;

    // Balance calculation
    if (!balances[data.customer]) {
      balances[data.customer] = 0;
    }

    if (data.type === "credit") {
      balances[data.customer] += data.amount;
    } else {
      balances[data.customer] -= data.amount;
    }

  });

  renderBalances(balances);
}

// Show balances
function renderBalances(balances) {

  let balanceDiv =
    document.getElementById("balanceList");

  balanceDiv.innerHTML = "";

  for (let customer in balances) {

    let balance = balances[customer];

    let color =
      balance > 0 ? "red" : "green";

    balanceDiv.innerHTML += `
      <div style="
        background:white;
        padding:15px;
        margin:10px 0;
        border-radius:8px;
      ">

        <b>${customer}</b><br>

        Balance:
        <span style="color:${color}">
          Rs ${balance}
        </span>

      </div>
    `;
  }
}

loadLedger();