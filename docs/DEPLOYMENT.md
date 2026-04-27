# Deployment

This file is a **summary**. The full step-by-step VPS guide stays in
[`/README_DEPLOY.md`](../README_DEPLOY.md) — this document only covers
the architecture-level invariants you must not break.

---

## 1. Pipeline

```
Local dev  →  GitHub (main)  →  VPS deploy.sh  →  pm2 + nginx  →  users
```

- Local machine **never** uploads files directly. Every change goes
  through git.
- VPS **never** runs hand-edited code. It only runs what's in
  `origin/main` after `./deploy/deploy.sh`.
- A pre-built artifact is **not** uploaded; the VPS builds itself, so
  there's exactly one source of truth (the repo).

---

## 2. What `deploy/deploy.sh` does

In order, on the VPS:

1. Verify Node ≥ 20, npm, pm2.
2. `git fetch && git reset --hard origin/main`.
3. `npm ci` (workspace-wide).
4. `npx prisma migrate deploy` + (only on `--first-run`) seed.
5. Build backend (`tsc`) and **all 7 frontend apps**, each with its own
   `--base=/<path>/` so asset URLs resolve under the nginx prefix.
6. Restart the API via `pm2 reload wms-api`.
7. `nginx -t && systemctl reload nginx`.

---

## 3. Single VPS, single IP, many routes

The VPS hosts:

| URL          | Served by                                    |
|--------------|----------------------------------------------|
| `/api/`      | Fastify on `127.0.0.1:4000` via nginx proxy  |
| `/admin/`    | `/var/www/wms/apps/admin-panel/dist`         |
| `/staff/`    | `/var/www/wms/apps/staff-app/dist`           |
| `/supervisor/` | `/var/www/wms/apps/supervisor-panel/dist`  |
| `/seller/`   | `/var/www/wms/apps/seller-app/dist`          |
| `/courier/`  | `/var/www/wms/apps/courier-app/dist`         |
| `/customer/` | `/var/www/wms/apps/customer-app/dist`        |
| `/pickup/`   | `/var/www/wms/apps/pickup-point-app/dist`    |
| `/`          | `302 /admin/`                                |

**No second IP, no second backend.**

---

## 4. Future: subdomains

The migration path is documented in
[`ARCHITECTURE.md`](./ARCHITECTURE.md#4-hosting-strategy). Summary:

1. Point each subdomain to the same VPS.
2. Duplicate each `location /xxx/` block in `wms.conf` into a separate
   `server { server_name xxx.domain.com; root … ; }` block, **without
   the path prefix**.
3. Rebuild every app with `--base=/` instead of `--base=/<path>/`.
4. Update CORS allow-list in `backend/api/.env`.

No app source code change.

---

## 5. Mobile builds

For Capacitor / React Native builds:

```bash
VITE_API_URL=https://api.domain.com/api npm --workspace apps/customer-app run build
```

After Capacitor is added to the app, the same `dist/` becomes the web
asset bundle inside the native shell.

---

## 6. Environment variables

Backend (`backend/api/.env`):

| Var              | Purpose                                                  |
|------------------|----------------------------------------------------------|
| `NODE_ENV`       | `production` on VPS                                      |
| `API_PORT`       | 4000                                                     |
| `API_HOST`       | `0.0.0.0`                                                |
| `JWT_SECRET`     | ≥ 32 random chars. Never commit.                         |
| `JWT_EXPIRES_IN` | `12h` default                                            |
| `DATABASE_URL`   | `file:./prisma/wms.db` or `postgresql://…`               |
| `CORS_ORIGINS`   | comma-separated origins, or `*` behind a reverse proxy   |

Frontend dev (`.env`):

| Var              | Purpose                                                  |
|------------------|----------------------------------------------------------|
| `VITE_API_URL`   | dev-only override of the proxy target. Empty in prod.    |

In production every web app calls **relative `/api`** — there is no
absolute URL in the bundle, so the same artifact works at any subdomain.

---

## 7. Rollback

```bash
ssh root@VPS
cd /var/www/wms
git log --oneline -10
git reset --hard <good_commit>
./deploy/deploy.sh
```

`./deploy/deploy.sh` is idempotent. Build is from the commit that's
currently checked out, so a `git reset` is a complete rollback.
