# @wms/pickup-point-app

PVZ (pickup point) operator app. Tablet-friendly.

- **Route on VPS:** `/pickup/`
- **Dev port:** 5179
- **Audience:** `PICKUP_OPERATOR`
- **API:** relative `/api` only

Functions: receive parcels from courier, store on shelves, scan order,
verify customer code on pickup, hand over to customer, returns, daily
report, point inventory.

For architecture rules see [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).
