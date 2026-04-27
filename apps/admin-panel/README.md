# @wms/admin-panel

System control panel for the ecosystem.

- **Route on VPS:** `/admin/`
- **Dev port:** 5174
- **Audience:** `SUPER_ADMIN`, `ADMIN`, `WAREHOUSE_MANAGER`
- **Login:** `W-002 / 0000` (manager) — see [/docs/APPS.md](../../docs/APPS.md)
- **API:** relative `/api` only (Vite proxy in dev, nginx in prod)

Pages: dashboard, users, roles, RBAC, customers, sellers, warehouses,
zones, locations, products/SKU, inventory, orders, deliveries,
couriers, tasks, problems, safety, audit, devices, KPI, settings.

For architecture rules see [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).
