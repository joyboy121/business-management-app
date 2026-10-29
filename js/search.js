import { db } from "./config/firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const searchableCollections = [
  { type: "Product", name: "inventory", fields: ["name", "categoryName", "category"], href: "inventory.html" },
  { type: "Invoice", name: "invoices", fields: ["invoiceNumber", "customerName"], href: "billing.html" },
  { type: "Customer", name: "customers", fields: ["name", "phone", "email"], href: "customers.html" },
  { type: "Supplier", name: "suppliers", fields: ["name", "phone", "email"], href: "suppliers.html" },
  { type: "Ledger", name: "ledger", fields: ["customer", "description", "type"], href: "ledger.html" }
];

const queryInput = document.getElementById("globalQuery");
const resultsBody = document.getElementById("searchResults");
const status = document.getElementById("searchStatus");
let records = [];

function renderResults() {
  const query = queryInput.value.trim().toLocaleLowerCase();
  resultsBody.replaceChildren();

  if (!query) {
    status.textContent = "Enter a word or phrase to search your business records.";
    return;
  }

  const matches = records
    .filter(record => record.values.some(value =>
      String(value || "").toLocaleLowerCase().includes(query)
    ))
    .slice(0, 100);

  status.textContent = matches.length
    ? matches.length + " matching records"
    : "No matching records found.";

  matches.forEach(record => {
    const row = document.createElement("tr");
    const typeCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const detailsCell = document.createElement("td");
    const link = document.createElement("a");

    typeCell.textContent = record.type;
    link.href = record.href;
    link.textContent = record.name;
    nameCell.appendChild(link);
    detailsCell.textContent = record.details;
    row.append(typeCell, nameCell, detailsCell);
    resultsBody.appendChild(row);
  });
}

async function loadRecords() {
  status.textContent = "Loading business records…";

  try {
    const groups = await Promise.all(searchableCollections.map(async source => {
      const snapshot = await getDocs(collection(db, source.name));
      return snapshot.docs.map(document => {
        const data = document.data();
        const values = source.fields.map(field => data[field]);

        return {
          type: source.type,
          href: source.href,
          name: String(values[0] || source.type + " record"),
          details: values.slice(1).filter(Boolean).join(" · "),
          values
        };
      });
    }));

    records = groups.flat();
    status.textContent = "Search products, invoices, customers, suppliers, and ledger entries.";
    renderResults();
  } catch (error) {
    console.error(error);
    status.textContent = "Unable to load records. Refresh the page to try again.";
  }
}

queryInput.addEventListener("input", renderResults);
loadRecords();
