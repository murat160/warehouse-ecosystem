# @wms/supervisor-panel

Tablet panel for shift supervisors.

- **Route on VPS:** `/supervisor/`
- **Dev port:** 5175
- **Audience:** `SHIFT_SUPERVISOR`, `WAREHOUSE_MANAGER`
- **Login:** `W-001 / 0000` — see [/docs/APPS.md](../../docs/APPS.md)
- **API:** relative `/api` only

Scope: own warehouse + current shift. Supervisor reassigns tasks,
resolves problem-tasks, reviews safety incidents, monitors KPI.

For architecture rules see [/docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).
