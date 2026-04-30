# Roles per app — architectural separation

Single source of truth for "who logs into which app".
Anything that contradicts this document is a bug.

## 1. The rule

> **Every role belongs to exactly one app.**
>
> A role's working interface lives in that one app and nowhere else.
> Admin Panel is for **management**, not for daily worker UIs.

In code this is enforced by the `appScope` field on every
`PredefinedRole` in `apps/admin-panel/src/app/data/rbac.ts`. The role
switcher in the header, the RBAC matrix, and the user list all read
this field to render badges and to keep external-app users distinct
from admin users.

```
appScope: 'admin' | 'courier' | 'warehouse' | 'seller'
        | 'pickup' | 'customer' | 'preview'
```

## 2. Apps + their roles

| App                       | Subdomain                  | Repo path              | Roles |
|---------------------------|----------------------------|------------------------|-------|
| **Admin Panel**           | `admin.ehlitrend.com`      | `apps/admin-panel`     | SuperAdmin · Admin · OperationsManager · PVZManager · WarehouseManager · CourierManager · SupportAgent · Accountant · ChiefAccountant · Lawyer · ComplianceManager · SellerManager · ProductManager · ShowcaseManager · MarketingManager · SecurityOfficer · Analyst · PolandFinance · TurkmenistanOperator · SupplierAccountant |
| **Customer App**          | `ehlitrend.com`            | `apps/customer-app`    | Customer |
| **Seller / Partner App**  | `partner.ehlitrend.com`    | `apps/seller-app`      | Seller (Owner / Admin / Manager / Staff / Store Employee / Restaurant Employee) |
| **Courier App**           | `courier.ehlitrend.com`    | `apps/courier-app`     | Courier (express delivery + warehouse courier — different permissions, same role family) |
| **Warehouse App**         | `warehouse.ehlitrend.com`  | `apps/warehouse-app`   | WarehouseAdmin · ShiftManager · WarehouseWorker · Picker · Packer · Receiver · InventoryController · ReturnsOperator · Dispatcher · QualityController |
| **PVZ / Pickup App**      | `pvz.ehlitrend.com`        | `apps/pickup-point-app`| PVZManager (in-app) · PickupOperator · PVZStaff · ReturnsOperatorPVZ |
| **Backend / API**         | `api.ehlitrend.com`        | `backend/api`          | — (auth via JWT, RBAC enforced server-side) |

## 3. Common confusion: "manager" vs "worker"

The same domain word means different things on different sides of the bus:

| Word          | Admin Panel role         | Working app role       |
|---------------|--------------------------|------------------------|
| **PVZ**       | `PVZManager` (oversees)  | `PickupOperator` (works) |
| **Warehouse** | `WarehouseManager` (oversees) | `WarehouseWorker` (works) |
| **Courier**   | `CourierManager` (oversees) | `Courier` (works) |
| **Seller**    | `SellerManager` (oversees) | `Seller` (works) |

The "Manager" half lives in Admin Panel, sees reports and KPIs, signs
off on incidents. The "Worker" half lives in the dedicated app, scans,
packs, drives, sells. **Never** route a worker through Admin Panel.

## 4. Why external roles still appear in Admin Panel

Admin Panel needs to be able to:

1. Create/disable a worker account (`/admin/users`).
2. Assign / change their role.
3. Audit their activity.
4. Preview "what would they see" via the role switcher.

That is **management**, not **work**. The worker themselves never opens
admin.ehlitrend.com to do their job — they open courier.ehlitrend.com,
warehouse.ehlitrend.com, etc.

In Admin Panel, external roles are tagged with a purple "External app"
badge in three places:

- `/admin/security/rbac` — role list + role detail panel.
- Header → "Просмотр как роль" — separate group "Внешние приложения · preview".
- `/admin/users` — next to each user's role chip.

## 5. Cross-app communication

Apps **never** call each other directly. The contract is always:

```
client app  →  GET/POST /api/...  →  backend  →  database
```

When the warehouse finishes packing and the courier should be notified,
the warehouse-app calls `POST /api/orders/:id/ready-for-pickup`. The
backend writes a row, emits an event, the courier-app polls or
subscribes. No `localStorage` shared between apps. No iframe of one app
inside another.

## 6. Where this is enforced in code

- **`apps/admin-panel/src/app/data/rbac.ts`** — `PredefinedRole.appScope`,
  `APP_SCOPE_LABELS`, `APP_SCOPE_HOSTS`.
- **`apps/admin-panel/src/app/data/rbac-data.ts`** — `EXTERNAL_APP_ROLES`,
  `isExternalAppRole(role)`. Used by legacy screens (UsersList,
  UsersCabinets).
- **`apps/admin-panel/src/app/pages/security/RBACManagement.tsx`** —
  badge + warning box in detail panel.
- **`apps/admin-panel/src/app/components/layout/DashboardLayout.tsx`** —
  role-switcher dropdown groups roles by scope.
- **`apps/admin-panel/src/app/pages/pvz/PVZScanTerminal.tsx`** — banner
  at the top: "real terminal lives in pickup-point-app".
- **`apps/admin-panel/src/app/pages/users/UsersList.tsx`** — purple
  "External app" pill next to role badge.

## 7. Adding a new role

1. Decide the app: admin, courier, warehouse, seller, pickup, customer.
2. Add the role to `PREDEFINED_ROLES` in `rbac.ts` with the correct
   `appScope`. For external scopes, keep `permissions` minimal — admins
   can preview but not work as that role.
3. If users with this role can be created from `/admin/users`, also add
   them to `EXTERNAL_APP_ROLES` in `rbac-data.ts` (host/app metadata).
4. Update this table.

## 8. Anti-patterns to flag in PR review

- A new admin sidebar item that does what the warehouse-app already does.
- A role with `appScope: 'courier'` that gets `pvz.scan.view` — that's
  cross-app leakage.
- A page in admin-panel that lets a courier accept their own delivery.
  Move it to `apps/courier-app`.
- A user in `/admin/users` whose role is `Customer` and who has any
  permission besides view-only — customers don't run admin tasks.

---

**Owner:** the architect of `docs/ARCHITECTURE.md`. Changes to this file
must update both files together.
