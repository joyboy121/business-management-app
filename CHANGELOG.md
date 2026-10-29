# Changelog

All notable ERP refactors, bug fixes, features, and Firestore schema changes are recorded here. Dates use Nepal time (Asia/Kathmandu).

## [Unreleased]

### Dashboard

- Replaced the legacy dashboard script with a dedicated service and controller.
- Added realtime Firestore listeners for sales, expenses, and inventory.
- Added transactional product sales and stock restoration when a modern product sale is deleted.
- Added validation, loading states, toast notifications, confirmation dialogs, loading skeletons, and empty states.
- Added safe DOM-based history rendering and refreshed KPI/chart rendering.

### Inventory

- Replaced the legacy Inventory script with dedicated service and controller modules.
- Added realtime category and product updates, reusable validation, loading states, toasts, dialogs, skeletons, and empty states.
- Added duplicate prevention, category ID relationships, product search, category filtering, sorting, image preview/upload, and responsive product table UI.
- Added transaction-based stock increments/decrements that prevent negative stock.
- Kept legacy `category` product values while writing `categoryId` and `categoryName` for backwards compatibility with current modules.

### Customers

- Added the Customers ERP module with realtime profile CRUD, validation, duplicate prevention, search, profile view, toast feedback, and confirmation dialogs.
- Added a backwards-compatible `customers` collection without modifying existing invoices or ledger entries.
- Customer invoice history and balances derive from current `invoices` and `ledger` records by normalized customer name until Billing and Ledger are migrated to stable customer IDs.
- Added Customers navigation and protected-route support.

### Billing

- Replaced the legacy Billing script with transactional service/controller modules and realtime product, customer, and invoice updates.
- New invoices now record stable `customerId`, a customer snapshot, `status`, and sequential `invoiceNumber` while retaining `customerName`, `items`, `grandTotal`, and `date` for backwards compatibility.
- Added customer selection, invoice drafts, item removal, validation, stock-safe invoice creation, PDF draft export, invoice search/filter, and invoice voiding with stock restoration.
- Legacy invoices remain readable; automatic voiding is intentionally disabled for them because their historical stock adjustment cannot be verified.

### Ledger

- Replaced legacy Ledger logic with realtime service/controller modules.
- New ledger entries now use stable `customerId` while retaining `customer` for compatibility with existing entries and Customer profile history.
- Added input validation, customer selection, live balance cards, full running balance calculations, transaction search/filter, confirmation-based deletion, CSV export, and toast/loading feedback.

### Suppliers

- Added a protected Suppliers module backed by the new `suppliers` Firestore collection.
- Added realtime supplier CRUD, validation, duplicate prevention, search, supplier profiles, dialogs, loading states, confirmation dialogs, and toast feedback.
- Added supplier navigation to the shared ERP pages and a purchase-history-ready profile area for the upcoming Purchasing module.

### Architecture

- Added the initial modular directory structure for configuration, services, UI, utilities, and validation.
- Centralized Firebase initialization in `js/config/firebase.js`.
- Kept `js/firebase-config.js` as a backwards-compatible re-export while older modules are refactored one at a time.

### Authentication

- Refactored authentication UI to use shared authentication, validation, notification, and loading-state modules.
- Added a reusable auth route guard and explicit local session persistence.
- Replaced authentication browser alerts with ERP toast notifications.

### Database

- No Firestore collection or document schema changes in this phase.
- Firebase Storage is now initialized and available for the future Inventory, Settings, and business-logo features.

## Baseline notes

- Existing collections: `inventory`, `categories`, `sales`, `expenses`, `invoices`, and `ledger`.
- Existing collection names and document fields remain unchanged during the foundation phase.

### Purchasing

- Added supplier-linked purchase orders with searchable status history, pending value summaries, cancellation, and transactional stock receipt.
- Added the purchaseOrders collection with supplier and product snapshots; receiving updates inventory stock and order status atomically.



### Phase 6 — Suppliers, Purchasing, and Warehouse

- Added location-level stock balances, warehouse transfers, and reasoned adjustments.
- Added append-only stock movement records for opening stock, purchase receipt, sales, invoice voids, sale reversals, and inventory adjustments.
- Connected supplier profiles to live purchase order history.

### Phase 7 — Reports, Settings, and Global Search

- Added date-filtered business reports with charts and CSV, Excel, and PDF exports.
- Added business profile, currency, tax, and invoice-prefix settings; billing uses configured tax and invoice prefix.
- Added global search for products, invoices, customers, suppliers, and ledger records.
- Added protected navigation routes for Warehouse, Reports, Settings, and Global Search.
