# Warehouse + Marketplace Ecosystem — Architecture

This document is the canonical description of the system. Anything that
contradicts it is a bug.

---

## 1. Big picture

```
                    ┌─────────────────────────────────┐
                    │   Single Hostinger VPS / IP     │
                    │                                 │
                    │  ┌───────────────────────────┐  │
                    │  │           nginx           │  │
                    │  │                           │  │
                    │  │  /api/  ──→ Backend API   │  │
                    │  │  /admin/      (SPA)       │  │
                    │  │  /staff/      (SPA)       │  │
                    │  │  /supervisor/ (SPA)       │  │
                    │  │  /seller/     (SPA)       │  │
                    │  │  /courier/    (SPA)       │  │
                    │  │  /customer/   (SPA)       │  │
                    │  │  /pickup/     (SPA)       │  │
                    │  └───────────┬───────────────┘  │
                    │              │                   │
                    │  ┌───────────▼───────────────┐  │
                    │  │  Backend API (Fastify)    │  │
                    │  │  + Prisma ORM             │  │
                    │  │  + JWT auth + RBAC        │  │
                    │  │  + Audit log              │  │
                    │  └───────────┬───────────────┘  │
                    │              │                   │
                    │       ┌──────▼──────┐            │
                    │       │  Database   │            │
                    │       │ (SQLite/Pg) │            │
                    │       └─────────────┘            │
                    └─────────────────────────────────┘

External partner chains (BIM-style)  ──→  /api/partner/*  (key-auth)
```

**One VPS, one IP, one database, one API. Many client applications.**

---

## 2. Repository layout

```
warehouse-ecosystem/
├── backend/
│   └── api/                 # Fastify + Prisma — only place with DB access
├── apps/
│   ├── admin-panel          # /admin/        — system control
│   ├── customer-app         # /customer/     — buyer (mobile-ready)
│   ├── seller-app           # /seller/       — merchant (incl. chains via Partner API)
│   ├── courier-app          # /courier/      — delivery (mobile-ready)
│   ├── staff-app            # /staff/        — warehouse worker
│   ├── pickup-point-app     # /pickup/       — PVZ operator
│   └── supervisor-panel     # /supervisor/   — shift lead
├── packages/
│   ├── shared-types         # TS DTOs + enums shared across apps
│   ├── api-client           # JWT-aware fetch client (relative /api only)
│   ├── ui                   # design primitives shared across apps
│   └── warehouse-core       # state machines, code generators, business rules
├── docs/                    # this folder
└── deploy/                  # nginx, Dockerfiles, deploy.sh, GH Actions
```

Rules:

- **Apps never own data.** All persistent state lives behind the backend API.
- **Apps never talk to other apps directly.** Inter-app communication is
  always through the backend.
- **`packages/`** holds anything two or more apps need. Anything that lives
  in only one app belongs in that app, not in `packages/`.

---

## 3. Why one backend, multiple apps

A single backend is mandatory because:

1. **One source of truth.** A package scanned in `staff-app` and a tracking
   query from `customer-app` must read the same row.
2. **One identity model.** Roles, permissions, audit log, scope rules sit
   on the server, not duplicated in 7 places.
3. **One contract.** Big partners integrate via `/api/partner/*`; new client
   apps (iOS, Android, kiosk) plug into the same API without touching it.

If you ever feel the urge to give an app its own database — stop. The
correct move is to add an endpoint to the backend.

---

## 4. Hosting strategy

### Today (single IP)

nginx on the VPS routes by URL path. Every app builds with its own
`--base=/<path>/` so asset URLs resolve correctly under that prefix.

### Tomorrow (subdomains)

Move each path to its own subdomain by editing **only `deploy/nginx/wms.conf`**:

| Path now      | Subdomain later                   |
|---------------|-----------------------------------|
| `/api/`       | `api.domain.com`                  |
| `/admin/`     | `admin.domain.com`                |
| `/staff/`     | `warehouse.domain.com`            |
| `/supervisor/`| `supervisor.domain.com`           |
| `/seller/`    | `seller.domain.com`               |
| `/courier/`   | `courier.domain.com`              |
| `/customer/`  | `customer.domain.com` (or root)   |
| `/pickup/`    | `pickup.domain.com`               |

Apps don't change. CORS allow-list moves from `*` to the new origins.
JWT cookies (when added) get `Domain=.domain.com`.

---

## 5. Mobile apps

`customer-app` and `courier-app` are PWA-ready and Capacitor-ready React
SPAs. To ship native:

1. `npx cap init` inside the app.
2. `VITE_API_URL=https://api.domain.com/api` at build time.
3. `npx cap add android && npx cap add ios`.
4. The same `/api` contract; no client code changes.

The `staff-app` is also PWA-ready and runs on Zebra-class Android handhelds.

---

## 6. Backend modules (current state)

Mounted under `/api/*`:

```
auth · users · roles · warehouses · zones · locations
products · skus · inventory
inbound (ASN + receiving + QC + putaway)
orders · tasks · picking · packing · shipping
returns · replenishment · cycle-count · problem-tasks
audit · devices · hardware · scans · kpi
supervisor                 ← shift-scoped aggregations
partner                    ← Partner API placeholder (Stage 6+)
```

Modules planned next:
`customers`, `merchant-organizations`, `merchant-branches`,
`pickup-points`, `notifications`, `chat`, `webhooks`.

The Partner API surface is reserved already — see
[`PARTNER_API.md`](./PARTNER_API.md).

---

## 7. Security baseline

- **JWT** secret only in `backend/api/.env`. Never in client code, never logged.
- **RBAC.** Backend checks the role on every write. Frontend hides UI
  affordances but is **never the sole gate**.
- **Audit log.** Every state-changing action writes an `AuditLog` row
  with `userId`, `action`, `entity`, `entityId`, `payload`, `ipAddress`.
- **Data minimization.** Pickers don't see customer phone numbers.
  Couriers don't see internal warehouse rows. Sellers see only their own
  org. Admin/Super Admin see everything within their scope.
- **`/api` only.** No client code references `localhost`, `127.0.0.1`,
  or `/api/api`. The `api-client` package enforces this.
- **Partner integrations** authenticate with `X-Partner-Key`, get a
  separate quota and audit channel, and never share JWT space with users.

See [`DEVELOPMENT_RULES.md`](./DEVELOPMENT_RULES.md) for code-level rules
and [`ROLES.md`](./ROLES.md) for the role-per-app separation contract
(which role logs into which subdomain, and why Admin Panel never replaces
the courier/warehouse/seller/pickup/customer working interfaces).
