import { db } from "./config/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { formatCurrency, formatDate } from "./utils/formatters.js";

const collectionNames = ["sales", "expenses", "invoices", "purchaseOrders"];
const reportData = {};
let chartInstance = null;

function toDate(value) {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInSelectedRange(record) {
  const date = toDate(record.createdAt || record.date);
  const fromValue = document.getElementById("reportFrom").value;
  const toValue = document.getElementById("reportTo").value;

  if (fromValue && (!date || date < new Date(fromValue + "T00:00:00"))) return false;
  if (toValue && (!date || date > new Date(toValue + "T23:59:59"))) return false;
  return true;
}

function getFilteredData() {
  return Object.fromEntries(
    collectionNames.map(name => [
      name,
      (reportData[name] || []).filter(isInSelectedRange)
    ])
  );
}

function getReportRows(rows) {
  return [
    ...rows.invoices.map(invoice => ({
      type: "Invoice",
      name: invoice.invoiceNumber || invoice.customerName || "Invoice",
      amount: Number(invoice.grandTotal) || 0,
      date: invoice.createdAt || invoice.date
    })),
    ...rows.sales.map(sale => ({
      type: "Sale",
      name: sale.productName || "Direct sale",
      amount: Number(sale.amount) || 0,
      date: sale.createdAt
    })),
    ...rows.expenses.map(expense => ({
      type: "Expense",
      name: expense.description || "Expense",
      amount: -(Number(expense.amount) || 0),
      date: expense.createdAt
    })),
    ...rows.purchaseOrders.map(order => ({
      type: "Purchase",
      name: order.orderNumber || order.supplierName || "Purchase order",
      amount: -(Number(order.totalCost) || 0),
      date: order.createdAt
    }))
  ].sort((first, second) => (toDate(second.date) || 0) - (toDate(first.date) || 0));
}

function renderChart(sales, expenses) {
  if (!window.Chart) return;

  const canvas = document.getElementById("reportChart");
  if (!canvas) return;

  chartInstance?.destroy();
  chartInstance = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Sales", "Expenses", "Net"],
      datasets: [{
        label: "Amount",
        data: [sales, expenses, sales - expenses],
        backgroundColor: ["#2563eb", "#dc2626", "#059669"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function renderReport() {
  const rows = getFilteredData();
  const sales = rows.sales.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
    + rows.invoices
      .filter(invoice => invoice.status !== "voided")
      .reduce((sum, invoice) => sum + (Number(invoice.grandTotal) || 0), 0);
  const expenses = rows.expenses.reduce(
    (sum, record) => sum + (Number(record.amount) || 0),
    0
  );

  document.getElementById("reportSales").textContent = formatCurrency(sales);
  document.getElementById("reportExpenses").textContent = formatCurrency(expenses);
  document.getElementById("reportNet").textContent = formatCurrency(sales - expenses);
  document.getElementById("reportOrders").textContent = String(rows.purchaseOrders.length);
  renderChart(sales, expenses);

  const tableBody = document.getElementById("reportRows");
  const emptyState = document.getElementById("reportEmptyState");
  const records = getReportRows(rows);
  tableBody.replaceChildren();
  emptyState.hidden = records.length > 0;
  emptyState.textContent = "No records found for this date range.";
  document.getElementById("reportLoadingState").textContent =
    records.length + " records in the selected date range.";

  records.forEach(record => {
    const row = document.createElement("tr");
    [
      record.type,
      record.name,
      formatDate(toDate(record.date)),
      formatCurrency(record.amount)
    ].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
}

function getExportRows() {
  return [
    ["Type", "Record", "Date", "Amount"],
    ...Array.from(document.querySelectorAll("#reportRows tr"), row =>
      Array.from(row.cells, cell => cell.textContent)
    )
  ];
}

function exportCsv() {
  const rows = getExportRows();
  const csv = rows
    .map(row => row.map(value =>
      String.fromCharCode(34)
      + String(value).replaceAll(String.fromCharCode(34), String.fromCharCode(34, 34))
      + String.fromCharCode(34)
    ).join(","))
    .join(String.fromCharCode(13, 10));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "business-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportExcel() {
  if (!window.XLSX) return;
  const sheet = window.XLSX.utils.aoa_to_sheet(getExportRows());
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, sheet, "Report");
  window.XLSX.writeFile(workbook, "business-report.xlsx");
}

function exportPdf() {
  if (!window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.text("Business Report", 14, 18);
  pdf.text("Sales: " + document.getElementById("reportSales").textContent, 14, 30);
  pdf.text("Expenses: " + document.getElementById("reportExpenses").textContent, 14, 40);
  pdf.text("Net: " + document.getElementById("reportNet").textContent, 14, 50);

  let y = 64;
  getExportRows().slice(1, 36).forEach(row => {
    pdf.text(row.join(" | ").slice(0, 100), 14, y);
    y += 7;
  });
  pdf.save("business-report.pdf");
}

document.querySelector("[data-action=report-apply]")?.addEventListener("click", renderReport);
document.querySelector("[data-action=report-export]")?.addEventListener("click", exportCsv);
document.querySelector("[data-action=report-excel]")?.addEventListener("click", exportExcel);
document.querySelector("[data-action=report-pdf]")?.addEventListener("click", exportPdf);

Promise.all(collectionNames.map(async name => {
  const snapshot = await getDocs(collection(db, name));
  reportData[name] = snapshot.docs.map(record => ({ id: record.id, ...record.data() }));
}))
  .then(renderReport)
  .catch(error => {
    console.error(error);
    document.getElementById("reportLoadingState").textContent =
      "Unable to load report data. Refresh the page to try again.";
  });
