# @wms/staff-app

Warehouse worker app — runs on Zebra-class Android handhelds and any
mobile browser.

- **Route on VPS:** `/staff/`
- **Dev port:** 5173
- **Audience:** `RECEIVER`, `QC_INSPECTOR`, `PUTAWAY_OPERATOR`,
  `PICKER`, `PACKER`, `SORTER`, `SHIPPING_OPERATOR`, `RETURNS_OPERATOR`,
  `REPLENISHMENT_OPERATOR`, `INVENTORY_CONTROLLER`
- **Login:** `W-204 / 1234` (picker) — see [/docs/APPS.md](../../docs/APPS.md)
- **API:** relative `/api` only

Workers see **only their own tasks**, filtered by role-allowed task
types. Bad scan → action blocked + problem-task auto-created on backend.

For architecture rules see [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).
