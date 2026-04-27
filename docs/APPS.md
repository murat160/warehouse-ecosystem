# Applications inventory

The ecosystem has **8 deployable units**: one backend + 7 frontend apps.
Each frontend app has a fixed nginx route, a fixed dev port, and a fixed
purpose. Don't fork them, don't merge them, don't rename them.

| # | Name                | Path on VPS    | Dev port | Mobile-ready | Audience                                                |
|---|---------------------|----------------|----------|--------------|---------------------------------------------------------|
| 0 | `backend/api`       | `/api/`        | 4000     | n/a          | Single API server for everything                        |
| 1 | `apps/admin-panel`  | `/admin/`      | 5174     | desktop      | Operations / management                                 |
| 2 | `apps/staff-app`    | `/staff/`      | 5173     | scanner / Android | Warehouse worker (picker, packer, QC, ...)         |
| 3 | `apps/supervisor-panel` | `/supervisor/` | 5175 | tablet       | Shift supervisor                                        |
| 4 | `apps/seller-app`   | `/seller/`     | 5176     | desktop      | Merchant / chain HQ (also: Partner API for big chains)  |
| 5 | `apps/courier-app`  | `/courier/`    | 5177     | Android / iOS | Delivery courier                                       |
| 6 | `apps/customer-app` | `/customer/`   | 5178     | Android / iOS | End-customer (buyer)                                   |
| 7 | `apps/pickup-point-app` | `/pickup/` | 5179     | tablet       | PVZ (pickup point) operator                             |

---

## 1. backend/api

Single source of truth. Owns:

- the database schema (Prisma);
- JWT auth + RBAC;
- all state machines (orders, tasks, ASN, RMA);
- audit log;
- the Partner API surface (`/api/partner/*`).

Apps **must not** open their own DB connections, and **must not** ship
their own duplicate business logic.

---

## 2. admin-panel

Top-level operator view. Login: any user with `ADMIN`, `SUPER_ADMIN`, or
`WAREHOUSE_MANAGER` role.

Pages:

- Dashboard, Users (+ invitations / teams / cabinets)
- Roles, RBAC, Permissions, Security Center, Audit Log
- Customers, Sellers / Merchants, Merchant branches
- Warehouses, Zones, Locations, Live Map
- Pickup points
- Products / SKU, Inventory
- Orders, Deliveries, Couriers
- Tasks, Problems, Safety / Incidents
- Devices / Scanners
- Partner integrations (read-only summary; full config from CLI)
- KPI dashboards
- Settings

---

## 3. staff-app

Mobile-first. Worker logs in by Employee ID + PIN.

Visible scope: **only their own tasks**. Role gates which task types they
can see (Receiver → RECEIVE only; Picker → PICK only; …).

Functions: receiving, QC, putaway, picking, packing, sortation,
shipping, returns, replenishment, cycle count, problem-task creation,
safety incident reporting, scanner input.

---

## 4. supervisor-panel

Tablet view. Login: `SHIFT_SUPERVISOR` or above.

Visible scope: own warehouse + shift.

Functions: live shift dashboard, workers list, active tasks, delayed
tasks, problem tasks, safety incidents, zone control, task
reassignment, KPI per worker, escalation up to Admin Panel.

---

## 5. seller-app

**One app — five operating modes.** The mode is detected from the
merchant record in the backend; the UI flips capabilities accordingly.

| Mode | Audience                                  | What's shown                                        |
|------|-------------------------------------------|-----------------------------------------------------|
|  A   | Маленький магазин (one stall, one owner)  | products, inventory, orders, returns                |
|  B   | Обычный продавец (single legal entity)    | + ASN/shipments, prices, documents, QC issues       |
|  C   | Большая сеть магазинов                    | + organization, branches, branch employees, reports |
|  D   | Сеть со своими складами                   | + own warehouses, branch-level inventory routing    |
|  E   | Сеть со своим приложением / ERP           | + Partner API keys panel, webhooks, sync status     |

The data model that powers modes C–E (added in Stage 6+):

| Entity                  | Purpose                                                |
|-------------------------|--------------------------------------------------------|
| `MerchantOrganization`  | top-level merchant; holds tax data, billing email      |
| `MerchantBranch`        | one row per store; address, lat/lng, externalId        |
| `MerchantWarehouse`     | own warehouse owned by the merchant (mode D/E)         |
| `MerchantIntegration`   | mode-E config: ERP type, sync schedule, last status    |
| `PartnerApiKey`         | hashed API key, scopes, lastUsedAt, revokedAt          |
| `PartnerWebhook`        | event, url, secret, retryPolicy                        |
| `BranchInventory`       | branchId, skuId, qty, reserved, updatedAt              |
| `BranchOrderRouting`    | rules: which branch fulfils which delivery zone        |

Big chains (BIM, Biedronka, Пятёрочка, supermarket networks) that
already run their own ERP / mobile app **don't fork this app and don't
get a copy**. They use Mode E:

1. Super Admin issues a `PartnerApiKey` for their `MerchantOrganization`.
2. The chain's existing ERP calls `/api/partner/*` to sync products,
   inventory, branches.
3. Inbound order events are pushed to the chain's webhook URL.
4. The chain's seller-app login still works for human operators in
   parallel — both surfaces see the same DB rows.

Full integrator contract: [Partner API](./PARTNER_API.md).

---

## 6. courier-app

Mobile-first. Courier logs in with Employee ID + PIN.

Visible scope: **only their own deliveries**. Customer phone number is
never returned in plaintext — couriers see a one-time masked dial link
that the API proxies.

Functions: assigned tasks list, accept/reject, pickup from
warehouse / store / pickup point, delivery to customer, status updates,
problem reports, photo proof, optional navigation hand-off.

---

## 7. customer-app

End-customer storefront. Public registration + login.

Functions: catalog, search, product detail, cart, checkout, address book,
order status, order history, favourites, notifications, support chat,
returns, courier tracking (scoped — sees the masked courier first name
and ETA, not the courier's identity).

Built as a PWA; ships to Android/iOS via Capacitor with the same code.

---

## 8. pickup-point-app

PVZ operator app. Login: `PICKUP_OPERATOR` (or higher).

Functions: receive parcels from courier, store on shelves/bins, scan
incoming order, verify customer code on pickup, hand over to customer,
process returns, daily report, point inventory.

---

## Don'ts

- ❌ Don't create a new copy of `seller-app` for a big chain. Use Partner API.
- ❌ Don't put DB queries in any app.
- ❌ Don't put business rules in any app — they live in
   `backend/api` and `packages/warehouse-core`.
- ❌ Don't hard-code API URLs. Web apps use relative `/api`. Mobile builds
   read `VITE_API_URL`.
- ❌ Don't create an 8th frontend app without updating this file and
   `deploy/nginx/wms.conf` in the same commit.
