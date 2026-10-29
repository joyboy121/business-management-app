# Bishal ERP Architecture

## Current module boundaries

```text
js/
  config/       Firebase initialization and environment-facing configuration
  core/         Shared application bootstrap and route-level behavior
  services/     Firebase and business-data access
  ui/           Toasts, loading states, and dialogs
  utils/        Pure presentation helpers such as dates and currency
  validation/   Reusable input validation
  modules/      Feature modules, migrated incrementally by ERP area
```

The legacy entry files in `js/` remain during migration so existing pages keep working. New code must use the folders above. Each existing module will be moved only after its replacement passes its functional regression checklist.

## Data migration policy

No destructive Firestore migration is permitted without a documented migration step, a backup, and a compatibility plan. New collections or fields must be recorded in `CHANGELOG.md`.

## Required verification per module

1. Input validation and visible loading state.
2. Successful operation shows a toast notification.
3. Error state is shown without a page refresh.
4. Related counters, tables, and summaries update immediately.
5. Existing behavior is manually regression-tested.


## Phase 6 stock traceability

Inventory products retain the aggregate stock field for existing modules and use
stockByLocation for warehouse balances. Each opening balance, receipt, sale,
reversal, and adjustment writes an append-only record to stockMovements.
Transfers move quantity between location balances without changing aggregate stock.
Legacy products without location balances are treated as being at main until their
first warehouse operation.

## Phase 7 business tools

Reports read normalized sales, expense, invoice, and purchase-order records.
Business configuration is stored in settings/businessProfile; the browser keeps
a local cache for currency formatting and billing defaults. Global Search reads
products, invoices, customers, suppliers, and ledger entries.
