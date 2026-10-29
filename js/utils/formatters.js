export function formatCurrency(amount, currency) {
  let chosenCurrency = currency;
  if (!chosenCurrency) { try { chosenCurrency = JSON.parse(localStorage.getItem("erp-business-settings") || "{}").currency || "Rs"; } catch { chosenCurrency = "Rs"; } }
  const value = Number(amount) || 0;
  return `${chosenCurrency} ${value.toLocaleString("en-NP", {
    maximumFractionDigits: 2
  })}`;
}

export function formatDate(value, options = {}) {
  if (!value) return "—";

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    ...options
  }).format(date);
}
