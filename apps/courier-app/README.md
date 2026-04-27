# @wms/courier-app

Mobile-first delivery app. Capacitor-ready React SPA — same code ships
to Android and iOS.

- **Route on VPS:** `/courier/`
- **Dev port:** 5177
- **Audience:** `COURIER` role
- **API:** relative `/api` (web) or `VITE_API_URL` (native build)

Scope: **only own deliveries**. Customer phone is never returned in
plaintext — couriers see a masked dial link the API proxies.

Functions: assigned tasks, accept/reject, pickup, delivery, status,
photo proof, problem reports, KPI.

For architecture rules see [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).
