# ERP CSS Naming Convention

Use these names for all future modules and avoid generic names such as `card`,
`panel`, `active`, or `button`.

## Shared application classes

- `erp-*` — application shell and shared controls: `erp-sidebar`, `erp-button`
- `erp-button--*` — button variant: `erp-button--primary`, `erp-button--danger`
- `is-*` — state only: `is-active`, `is-disabled`
- `form-card` — reusable white form or content card
- `form-field` — label and input/select field group
- `data-table` — reusable ERP data table
- `stat-card` — reusable KPI summary card

## Module classes

Prefix a class with its module name when it belongs to one module only.

- Dashboard: `dashboard-*`, `kpi-*`, `sale-form`, `history-card`
- Inventory: `inventory-*`
- Billing: `billing-*`
- Ledger: `ledger-*`
- Authentication: `auth-*`

New modules should follow the same pattern, for example `customers-*`,
`suppliers-*`, and `purchasing-*`.
